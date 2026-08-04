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

export type Config = {
  pts_meta: number
  pts_dia: number
  pts_rotina: number
  pts_streak: number
  conv_alta_min: number
  pts_conv_alta: number
  conv_media_min: number
  pts_conv_media: number
  conv_baixa_min: number
  pts_conv_baixa: number
  com_pct_meta: number
  com_pct_sem: number
}

export type Desafio = {
  id: string
  titulo: string
  descricao: string | null
  tipo: string
  alvo: number
  pontos: number
  data_inicio: string
  data_fim: string
  ativo: boolean
}

export type DesafioProgresso = { desafio: Desafio; atual: number; concluido: boolean }

export type Medalha = { slug: string; nome: string; icone: string; desc: string; conquistada: boolean }

export type Detalhe = { meta: number; dias: number; conversao: number; rotina: number; streak: number; desafios: number }

export type VendedorGam = {
  id: string
  nome: string
  pontos: number
  detalhe: Detalhe
  nivel: Nivel | null
  proximoNivel: Nivel | null
  faltaProximo: number
  medalhas: Medalha[]
  desafios: DesafioProgresso[]
  valorMes: number
  cotaMes: number
  conversao: number
  ticket: number
}

const CONFIG_PADRAO: Config = {
  pts_meta: 200,
  pts_dia: 10,
  pts_rotina: 1,
  pts_streak: 5,
  conv_alta_min: 60,
  pts_conv_alta: 60,
  conv_media_min: 45,
  pts_conv_media: 40,
  conv_baixa_min: 30,
  pts_conv_baixa: 20,
  com_pct_meta: 2,
  com_pct_sem: 1,
}

export const TIPOS_DESAFIO: { valor: string; label: string; unidade: string }[] = [
  { valor: 'valor', label: 'Faturamento (R$)', unidade: 'R$' },
  { valor: 'vendas', label: 'Nº de vendas', unidade: 'vendas' },
  { valor: 'pecas', label: 'Peças', unidade: 'peças' },
  { valor: 'atendimentos', label: 'Atendimentos', unidade: 'atend.' },
  { valor: 'conversao', label: 'Taxa de conversão (%)', unidade: '%' },
  { valor: 'dias_meta', label: 'Dias batendo a meta', unidade: 'dias' },
]

export function regrasTexto(c: Config): string[] {
  return [
    `Meta do mês: até ${c.pts_meta} pts ao bater 100% (150%+ = ${Math.round(c.pts_meta * 1.5)})`,
    `Cada dia batendo a cota: +${c.pts_dia} pts`,
    `Taxa de conversão: +${c.pts_conv_alta} (≥${c.conv_alta_min}%), +${c.pts_conv_media} (≥${c.conv_media_min}%), +${c.pts_conv_baixa} (≥${c.conv_baixa_min}%)`,
    `Cada item de rotina concluído: +${c.pts_rotina} pt`,
    `Cada dia de sequência batendo meta: +${c.pts_streak} pts`,
    `Desafios concluídos somam os pontos definidos em cada desafio.`,
  ]
}

export async function calcularGamificacao(
  supabase: SupabaseClient,
  ano: number,
  mes: number
): Promise<{ vendedores: VendedorGam[]; niveis: Nivel[]; config: Config; desafios: Desafio[] }> {
  const inicioMes = `${ano}-${String(mes).padStart(2, '0')}-01`
  const ultimoDia = new Date(ano, mes, 0).getDate()
  const fimMes = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`
  const hojeStr = new Date().toISOString().slice(0, 10)

  const { data: niveisRaw } = await supabase.from('gam_niveis').select('*').order('ordem')
  const niveis = (niveisRaw ?? []) as Nivel[]

  const { data: configRaw } = await supabase.from('gam_config').select('*').eq('id', 1).maybeSingle()
  const config = { ...CONFIG_PADRAO, ...(configRaw ?? {}) } as Config

  // Desafios ativos que ainda não terminaram (no máximo até hoje).
  const { data: desafiosRaw } = await supabase
    .from('gam_desafios')
    .select('*')
    .eq('ativo', true)
    .gte('data_fim', inicioMes)
    .order('data_fim')
  const desafios = (desafiosRaw ?? []) as Desafio[]

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

  // Lançamentos amplos para os desafios (podem ter janela fora do mês atual).
  const inicioDesafios = desafios.reduce((min, d) => (d.data_inicio < min ? d.data_inicio : min), inicioMes)
  const { data: lancDesafio } = await supabase
    .from('lancamentos')
    .select('vendedor_id, data, valor, atendimentos, vendas, pecas')
    .not('vendedor_id', 'is', null)
    .gte('data', inicioDesafios)
    .lte('data', hojeStr)
  const { data: distDesafio } = await supabase
    .from('distribuicao_diaria')
    .select('vendedor_id, data, cota_valor, situacao')
    .not('vendedor_id', 'is', null)
    .gte('data', inicioDesafios)
    .lte('data', hojeStr)

  function nivelDe(pontos: number): { nivel: Nivel | null; prox: Nivel | null } {
    let nivel: Nivel | null = null
    for (const n of niveis) {
      if (pontos >= n.pts_min && (n.pts_max === null || pontos <= n.pts_max)) nivel = n
    }
    const prox = niveis.find((n) => n.pts_min > pontos) ?? null
    return { nivel, prox }
  }

  function progressoDesafio(vendedorId: string, d: Desafio): number {
    const ate = hojeStr < d.data_fim ? hojeStr : d.data_fim
    const lv = (lancDesafio ?? []).filter((l) => l.vendedor_id === vendedorId && l.data >= d.data_inicio && l.data <= ate)
    if (d.tipo === 'valor') return lv.reduce((a, l) => a + Number(l.valor), 0)
    if (d.tipo === 'vendas') return lv.reduce((a, l) => a + Number(l.vendas ?? 0), 0)
    if (d.tipo === 'pecas') return lv.reduce((a, l) => a + Number(l.pecas ?? 0), 0)
    if (d.tipo === 'atendimentos') return lv.reduce((a, l) => a + Number(l.atendimentos ?? 0), 0)
    if (d.tipo === 'conversao') {
      const at = lv.reduce((a, l) => a + Number(l.atendimentos ?? 0), 0)
      const vd = lv.reduce((a, l) => a + Number(l.vendas ?? 0), 0)
      return at > 0 ? (vd / at) * 100 : 0
    }
    if (d.tipo === 'dias_meta') {
      const cota = new Map(
        (distDesafio ?? [])
          .filter((x) => x.vendedor_id === vendedorId && x.situacao === 'normal' && x.data >= d.data_inicio && x.data <= ate)
          .map((x) => [x.data, Number(x.cota_valor)])
      )
      const venda = new Map<string, number>()
      for (const l of lv) venda.set(l.data, (venda.get(l.data) ?? 0) + Number(l.valor))
      let n = 0
      for (const [data, c] of cota) if (c > 0 && (venda.get(data) ?? 0) >= c) n++
      return n
    }
    return 0
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

    let diasBatendo = 0
    for (const [data, cota] of cotaDia) if (cota > 0 && (vendaDia.get(data) ?? 0) >= cota) diasBatendo++

    const diasOrdenados = [...cotaDia.entries()].filter(([, c]) => c > 0).sort((a, b) => (a[0] < b[0] ? 1 : -1))
    let streak = 0
    for (const [data, cota] of diasOrdenados) {
      const bateu = (vendaDia.get(data) ?? 0) >= cota
      if (data === hojeStr && !bateu) continue
      if (bateu) streak++
      else break
    }

    const rotinaCount = (rotina ?? []).filter((r) => r.vendedor_id === v.id).length

    const pontosConv =
      conversao >= config.conv_alta_min
        ? config.pts_conv_alta
        : conversao >= config.conv_media_min
        ? config.pts_conv_media
        : conversao >= config.conv_baixa_min
        ? config.pts_conv_baixa
        : 0

    const ptsMeta = cotaMes > 0 ? Math.round(Math.min(valorMes / cotaMes, 1.5) * config.pts_meta) : 0
    const ptsDias = diasBatendo * config.pts_dia
    const ptsRotina = rotinaCount * config.pts_rotina
    const ptsStreak = streak * config.pts_streak

    // Desafios
    const desafiosProg: DesafioProgresso[] = desafios.map((d) => {
      const atual = progressoDesafio(v.id, d)
      return { desafio: d, atual, concluido: atual >= Number(d.alvo) }
    })
    const ptsDesafios = desafiosProg.filter((dp) => dp.concluido).reduce((a, dp) => a + Number(dp.desafio.pontos), 0)

    const pontos = ptsMeta + ptsDias + pontosConv + ptsRotina + ptsStreak + ptsDesafios

    return {
      v,
      pontos,
      detalhe: { meta: ptsMeta, dias: ptsDias, conversao: pontosConv, rotina: ptsRotina, streak: ptsStreak, desafios: ptsDesafios },
      valorMes,
      cotaMes,
      conversao,
      ticket,
      streakDias: streak,
      rotinaCount,
      desafiosProg,
    }
  })

  const maxTicket = Math.max(0, ...base.map((b) => b.ticket))
  const liderId = [...base].sort((a, b) => b.pontos - a.pontos)[0]?.v.id

  const vendedoresGam: VendedorGam[] = base.map((b) => {
    const { nivel, prox } = nivelDe(b.pontos)
    const medalhas: Medalha[] = [
      { slug: 'meta', nome: 'Bateu a Meta', icone: '🏆', desc: 'Atingiu 100% da meta do mês', conquistada: b.cotaMes > 0 && b.valorMes >= b.cotaMes },
      { slug: 'streak', nome: 'Sequência Quente', icone: '🔥', desc: '5+ dias seguidos batendo a meta', conquistada: b.streakDias >= 5 },
      { slug: 'conversao', nome: 'Conversão Alta', icone: '🎯', desc: 'Taxa de conversão ≥ 50% no mês', conquistada: b.conversao >= 50 },
      { slug: 'ticket', nome: 'Ticket de Ouro', icone: '💰', desc: 'Maior ticket médio da equipe', conquistada: maxTicket > 0 && b.ticket >= maxTicket },
      { slug: 'dedicado', nome: 'Dedicado', icone: '⭐', desc: '30+ itens de rotina concluídos', conquistada: b.rotinaCount >= 30 },
      { slug: 'lider', nome: 'Líder do Mês', icone: '👑', desc: '1º lugar em pontos', conquistada: b.v.id === liderId && b.pontos > 0 },
    ]
    return {
      id: b.v.id,
      nome: b.v.nome,
      pontos: b.pontos,
      detalhe: b.detalhe,
      nivel,
      proximoNivel: prox,
      faltaProximo: prox ? Math.max(prox.pts_min - b.pontos, 0) : 0,
      medalhas,
      desafios: b.desafiosProg,
      valorMes: b.valorMes,
      cotaMes: b.cotaMes,
      conversao: b.conversao,
      ticket: b.ticket,
    }
  })

  vendedoresGam.sort((a, b) => b.pontos - a.pontos)
  return { vendedores: vendedoresGam, niveis, config, desafios }
}
