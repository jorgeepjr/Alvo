import { SupabaseClient } from '@supabase/supabase-js'

export type Nivel = {
  id: number
  nome: string
  pts_min: number
  pts_max: number | null
  cor: string
  icone: string
  beneficio: string
  ordem: number
}

export type Medalha = { slug: string; nome: string; icone: string; desc: string; conquistada: boolean }

export type Detalhe = { meta: number; dias: number; conversao: number; rotina: number; streak: number }

export type VendedorGam = {
  id: string
  nome: string
  pontos: number
  detalhe: Detalhe
  nivel: Nivel | null
  proximoNivel: Nivel | null
  faltaProximo: number
  medalhas: Medalha[]
  // dados brutos úteis para exibição
  valorMes: number
  cotaMes: number
  conversao: number
  ticket: number
}

// Regras de pontuação (transparentes; os NÍVEIS é que o gestor ajusta).
const PTS = {
  metaFator: 200, // hitting 100% da meta = 200 pts (limitado a 150% = 300)
  porDiaBatido: 10,
  porItemRotina: 1,
  porDiaStreak: 5,
  conv60: 60,
  conv45: 40,
  conv30: 20,
}

export function pontosConversao(conv: number): number {
  if (conv >= 60) return PTS.conv60
  if (conv >= 45) return PTS.conv45
  if (conv >= 30) return PTS.conv30
  return 0
}

export const REGRAS_TEXTO = [
  `Meta do mês: até ${PTS.metaFator} pts ao bater 100% (150%+ = ${Math.round(PTS.metaFator * 1.5)})`,
  `Cada dia batendo a cota: +${PTS.porDiaBatido} pts`,
  `Taxa de conversão: +${PTS.conv60} (≥60%), +${PTS.conv45} (≥45%), +${PTS.conv30} (≥30%)`,
  `Cada item de rotina concluído: +${PTS.porItemRotina} pt`,
  `Cada dia de sequência batendo meta: +${PTS.porDiaStreak} pts`,
]

export async function calcularGamificacao(
  supabase: SupabaseClient,
  ano: number,
  mes: number
): Promise<{ vendedores: VendedorGam[]; niveis: Nivel[] }> {
  const inicioMes = `${ano}-${String(mes).padStart(2, '0')}-01`
  const ultimoDia = new Date(ano, mes, 0).getDate()
  const fimMes = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`
  const hojeStr = new Date().toISOString().slice(0, 10)

  const { data: niveisRaw } = await supabase.from('gam_niveis').select('*').order('ordem')
  const niveis = (niveisRaw ?? []) as Nivel[]

  const { data: vendedores } = await supabase
    .from('profiles')
    .select('id, nome')
    .eq('perfil', 'vendedor')
    .eq('ativo', true)
    .order('nome')

  const { data: lanc } = await supabase
    .from('lancamentos')
    .select('vendedor_id, data, valor, atendimentos, vendas, pecas')
    .not('vendedor_id', 'is', null)
    .gte('data', inicioMes)
    .lte('data', fimMes)

  const { data: dist } = await supabase
    .from('distribuicao_diaria')
    .select('vendedor_id, data, cota_valor, situacao')
    .not('vendedor_id', 'is', null)
    .gte('data', inicioMes)
    .lte('data', fimMes)

  const { data: rotina } = await supabase
    .from('rotina_concluida')
    .select('vendedor_id, data')
    .gte('data', inicioMes)
    .lte('data', fimMes)

  function nivelDe(pontos: number): { nivel: Nivel | null; prox: Nivel | null } {
    let nivel: Nivel | null = null
    for (const n of niveis) {
      if (pontos >= n.pts_min && (n.pts_max === null || pontos <= n.pts_max)) nivel = n
    }
    const prox = niveis.find((n) => n.pts_min > pontos) ?? null
    return { nivel, prox }
  }

  const base = (vendedores ?? []).map((v) => {
    const lv = (lanc ?? []).filter((l) => l.vendedor_id === v.id)
    const dv = (dist ?? []).filter((d) => d.vendedor_id === v.id)
    const cotaDia = new Map(dv.filter((d) => d.situacao === 'normal').map((d) => [d.data, Number(d.cota_valor)]))
    const vendaDia = new Map<string, number>()
    for (const l of lv) vendaDia.set(l.data, (vendaDia.get(l.data) ?? 0) + Number(l.valor))

    const valorMes = lv.reduce((a, l) => a + Number(l.valor), 0)
    const atend = lv.reduce((a, l) => a + Number(l.atendimentos ?? 0), 0)
    const vendas = lv.reduce((a, l) => a + Number(l.vendas ?? 0), 0)
    const cotaMes = dv.filter((d) => d.situacao === 'normal').reduce((a, d) => a + Number(d.cota_valor), 0)
    const conversao = atend > 0 ? (vendas / atend) * 100 : 0
    const ticket = vendas > 0 ? valorMes / vendas : atend > 0 ? valorMes / atend : 0

    // dias batendo a cota
    let diasBatendo = 0
    for (const [data, cota] of cotaDia) {
      if (cota > 0 && (vendaDia.get(data) ?? 0) >= cota) diasBatendo++
    }

    // streak (dias seguidos batendo, do mais recente pra trás; hoje não quebra)
    const diasOrdenados = [...cotaDia.entries()].filter(([, c]) => c > 0).sort((a, b) => (a[0] < b[0] ? 1 : -1))
    let streak = 0
    for (const [data, cota] of diasOrdenados) {
      const bateu = (vendaDia.get(data) ?? 0) >= cota
      if (data === hojeStr && !bateu) continue
      if (bateu) streak++
      else break
    }

    const rotinaCount = (rotina ?? []).filter((r) => r.vendedor_id === v.id).length

    const ptsMeta = cotaMes > 0 ? Math.round(Math.min(valorMes / cotaMes, 1.5) * PTS.metaFator) : 0
    const ptsDias = diasBatendo * PTS.porDiaBatido
    const ptsConv = pontosConversao(conversao)
    const ptsRotina = rotinaCount * PTS.porItemRotina
    const ptsStreak = streak * PTS.porDiaStreak
    const pontos = ptsMeta + ptsDias + ptsConv + ptsRotina + ptsStreak

    return {
      id: v.id,
      nome: v.nome,
      pontos,
      detalhe: { meta: ptsMeta, dias: ptsDias, conversao: ptsConv, rotina: ptsRotina, streak: ptsStreak },
      valorMes,
      cotaMes,
      conversao,
      ticket,
      streakDias: streak,
      rotinaCount,
    }
  })

  // Contexto de equipe (para medalhas relativas)
  const maxTicket = Math.max(0, ...base.map((b) => b.ticket))
  const liderId = [...base].sort((a, b) => b.pontos - a.pontos)[0]?.id

  const vendedoresGam: VendedorGam[] = base.map((b) => {
    const { nivel, prox } = nivelDe(b.pontos)
    const medalhas: Medalha[] = [
      { slug: 'meta', nome: 'Bateu a Meta', icone: '🏆', desc: 'Atingiu 100% da meta do mês', conquistada: b.cotaMes > 0 && b.valorMes >= b.cotaMes },
      { slug: 'streak', nome: 'Sequência Quente', icone: '🔥', desc: '5+ dias seguidos batendo a meta', conquistada: b.streakDias >= 5 },
      { slug: 'conversao', nome: 'Conversão Alta', icone: '🎯', desc: 'Taxa de conversão ≥ 50% no mês', conquistada: b.conversao >= 50 },
      { slug: 'ticket', nome: 'Ticket de Ouro', icone: '💰', desc: 'Maior ticket médio da equipe', conquistada: maxTicket > 0 && b.ticket >= maxTicket },
      { slug: 'dedicado', nome: 'Dedicado', icone: '⭐', desc: '30+ itens de rotina concluídos', conquistada: b.rotinaCount >= 30 },
      { slug: 'lider', nome: 'Líder do Mês', icone: '👑', desc: '1º lugar em pontos', conquistada: b.id === liderId && b.pontos > 0 },
    ]
    return {
      id: b.id,
      nome: b.nome,
      pontos: b.pontos,
      detalhe: b.detalhe,
      nivel,
      proximoNivel: prox,
      faltaProximo: prox ? Math.max(prox.pts_min - b.pontos, 0) : 0,
      medalhas,
      valorMes: b.valorMes,
      cotaMes: b.cotaMes,
      conversao: b.conversao,
      ticket: b.ticket,
    }
  })

  vendedoresGam.sort((a, b) => b.pontos - a.pontos)
  return { vendedores: vendedoresGam, niveis }
}
