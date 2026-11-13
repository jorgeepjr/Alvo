import { SupabaseClient } from '@supabase/supabase-js'

export async function atualizarHistoricoMes(supabase: SupabaseClient, data: string): Promise<void> {
  const [anoStr, mesStr] = data.split('-')
  const ano = Number(anoStr)
  const mes = Number(mesStr)

  // Até mai/2026 o histórico veio das planilhas e os lançamentos daquela época
  // estão incompletos: recalcular pela soma dos lançamentos apagaria venda.
  if (`${anoStr}-${mesStr}` < '2026-06') return

  const inicioMes = `${ano}-${String(mes).padStart(2, '0')}-01`
  const ultimoDia = new Date(ano, mes, 0).getDate()
  const fimMes = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`

  const { data: lancamentos } = await supabase
    .from('lancamentos')
    .select('valor, atendimentos, pecas')
    .gte('data', inicioMes)
    .lte('data', fimMes)
  const { data: meta } = await supabase
    .from('metas_mensais')
    .select('meta_valor')
    .eq('ano', ano)
    .eq('mes', mes)
    .maybeSingle()

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
