'use server'

import { createClient } from '@/lib/supabase/server'

const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// Dados para a tela de Histórico visual: faturamento por ano, por mês (do ano
// selecionado) e por dia (do mês selecionado).
export async function buscarHistoricoVisual(ano: number, mes: number) {
  const supabase = await createClient()

  const { data: hl } = await supabase.from('historico_loja').select('ano, mes, venda_total').order('ano').order('mes')

  // Por ano
  const mapaAno = new Map<number, number>()
  for (const h of hl ?? []) mapaAno.set(h.ano, (mapaAno.get(h.ano) ?? 0) + Number(h.venda_total))
  const porAno = [...mapaAno.entries()].sort((a, b) => a[0] - b[0]).map(([a, v]) => ({ label: String(a), valor: Math.round(v) }))

  // Por mês do ano selecionado
  const porMes = MESES_CURTO.map((nome, i) => {
    const row = (hl ?? []).find((h) => h.ano === ano && h.mes === i + 1)
    return { label: nome, valor: row ? Math.round(Number(row.venda_total)) : 0 }
  })

  // Por dia do mês selecionado
  const mm = String(mes).padStart(2, '0')
  const ultimoDia = new Date(ano, mes, 0).getDate()
  const inicio = `${ano}-${mm}-01`
  const fim = `${ano}-${mm}-${String(ultimoDia).padStart(2, '0')}`

  const vendaDia = new Map<string, number>()
  // Histórico importado (anos anteriores)
  const { data: diario } = await supabase
    .from('historico_diario')
    .select('data, venda_total')
    .gte('data', inicio)
    .lte('data', fim)
  for (const d of diario ?? []) vendaDia.set(d.data, Number(d.venda_total))
  // Se não houver no histórico importado, usa os lançamentos do sistema
  if (vendaDia.size === 0) {
    const { data: lanc } = await supabase
      .from('lancamentos')
      .select('data, valor')
      .gte('data', inicio)
      .lte('data', fim)
    for (const l of lanc ?? []) vendaDia.set(l.data, (vendaDia.get(l.data) ?? 0) + Number(l.valor))
  }

  // Mesmo mês no ano anterior (para comparar dia a dia)
  const { data: diarioAnt } = await supabase
    .from('historico_diario')
    .select('data, venda_total')
    .gte('data', `${ano - 1}-${mm}-01`)
    .lte('data', `${ano - 1}-${mm}-31`)
  const vendaDiaAnt = new Map<string, number>()
  for (const d of diarioAnt ?? []) vendaDiaAnt.set(d.data.slice(8, 10), Number(d.venda_total))
  const temAnoAnterior = vendaDiaAnt.size > 0

  const porDia = Array.from({ length: ultimoDia }, (_, i) => {
    const dia = i + 1
    const dd = String(dia).padStart(2, '0')
    return {
      label: String(dia),
      valor: Math.round(vendaDia.get(`${ano}-${mm}-${dd}`) ?? 0),
      anoAnterior: temAnoAnterior ? Math.round(vendaDiaAnt.get(dd) ?? 0) : null,
    }
  })

  const anosDisponiveis = porAno.map((a) => Number(a.label))

  return { porAno, porMes, porDia, anosDisponiveis, temAnoAnterior }
}

export async function buscarHistorico(metrica: 'valor' | 'atendimentos' | 'pecas') {
  const supabase = await createClient()
  const { data } = await supabase.from('historico_loja').select('*').order('ano').order('mes')

  const anos = Array.from(new Set((data ?? []).map((d) => d.ano))).sort()
  const campoVenda = metrica === 'valor' ? 'venda_total' : metrica
  const campoCota = metrica === 'valor' ? 'cota_total' : metrica

  const vendas = anos.map((ano) => ({
    ano,
    mensal: Array.from({ length: 12 }, (_, i) => {
      const row = data?.find((d) => d.ano === ano && d.mes === i + 1)
      return row ? Number(row[campoVenda as keyof typeof row]) : null
    }),
  }))

  const cotas = anos.map((ano) => ({
    ano,
    mensal: Array.from({ length: 12 }, (_, i) => {
      const row = data?.find((d) => d.ano === ano && d.mes === i + 1)
      if (!row) return null
      return metrica === 'valor' ? Number(row.cota_total) : null
    }),
  }))

  const series = anos.map((ano) => {
    let acumulado = 0
    const valores = Array.from({ length: 12 }, (_, i) => {
      const row = data?.find((d) => d.ano === ano && d.mes === i + 1)
      if (!row) return null
      acumulado += Number(row[campoVenda as keyof typeof row])
      return acumulado
    })
    return { ano, acumulado: valores }
  })

  return { vendas, cotas, series }
}

const MESES_NOMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export async function buscarComparativoAnual(metrica: 'valor' | 'atendimentos' | 'pecas') {
  const supabase = await createClient()
  const { data } = await supabase.from('historico_loja').select('*').order('ano').order('mes')

  const campo = metrica === 'valor' ? 'venda_total' : metrica
  const anos = Array.from(new Set((data ?? []).map((d) => d.ano))).sort()

  const linhas = Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1
    const valoresPorAno = anos.map((ano) => {
      const row = data?.find((d) => d.ano === ano && d.mes === mes)
      return row ? Number(row[campo as keyof typeof row]) : null
    })
    const variacoes = valoresPorAno.map((valor, idx) => {
      const anterior = valoresPorAno[idx - 1]
      if (idx === 0 || valor === null || anterior === null || anterior === 0) return null
      return ((valor - anterior) / anterior) * 100
    })
    return { mes, nome: MESES_NOMES[i], valoresPorAno, variacoes }
  })

  return { anos, linhas }
}

export async function buscarComparativoCompleto() {
  const valor = await buscarComparativoAnual('valor')
  const atendimentos = await buscarComparativoAnual('atendimentos')
  const pecas = await buscarComparativoAnual('pecas')
  return { valor, atendimentos, pecas }
}

export async function consolidarMesAtual(): Promise<void> {
  const supabase = await createClient()
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth() + 1
  const inicioMes = `${ano}-${String(mes).padStart(2, '0')}-01`
  const ultimoDia = new Date(ano, mes, 0).getDate()
  const fimMes = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`

  const { data: lancamentos } = await supabase.from('lancamentos').select('*').gte('data', inicioMes).lte('data', fimMes)
  const { data: meta } = await supabase.from('metas_mensais').select('*').eq('ano', ano).eq('mes', mes).maybeSingle()

  const venda_total = lancamentos?.reduce((acc, l) => acc + Number(l.valor), 0) ?? 0
  const atendimentos = lancamentos?.reduce((acc, l) => acc + l.atendimentos, 0) ?? 0
  const pecas = lancamentos?.reduce((acc, l) => acc + l.pecas, 0) ?? 0

  await supabase.from('historico_loja').upsert(
    {
      ano,
      mes,
      venda_total,
      cota_total: Number(meta?.meta_valor ?? 0),
      atendimentos,
      pecas,
      origem: 'sistema',
    },
    { onConflict: 'ano,mes' }
  )
}
