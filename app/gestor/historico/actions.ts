'use server'

import { createClient } from '@/lib/supabase/server'

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
