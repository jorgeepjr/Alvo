'use server'

import { createClient } from '@/lib/supabase/server'
import { distribuirCotaInteira, calcularSugestaoMeta, calcularSugestaoTendencia } from '@/lib/calculos'
import { revalidatePath } from 'next/cache'

const PESOS_DEFAULT: Record<number, number> = {
  0: 0, // domingo — sem cota por padrão (loja normalmente fechada)
  1: 0.7, // segunda
  2: 0.8, // terça
  3: 0.8, // quarta
  4: 0.9, // quinta
  5: 1.1, // sexta
  6: 1.4, // sábado
}

export async function salvarMetaMensal(formData: FormData): Promise<void> {
  const ano = Number(formData.get('ano'))
  const mes = Number(formData.get('mes'))
  const meta_valor = Math.round(Number(formData.get('meta_valor')))
  const meta_atendimentos = Math.round(Number(formData.get('meta_atendimentos')))
  const meta_pecas = Math.round(Number(formData.get('meta_pecas')))

  const supabase = await createClient()
  await supabase
    .from('metas_mensais')
    .upsert({ ano, mes, meta_valor, meta_atendimentos, meta_pecas }, { onConflict: 'ano,mes' })

  revalidatePath('/gestor/metas')
}

function diasDoMes(ano: number, mes: number): { data: string; pesoPadrao: number; diaSemana: number }[] {
  const dias: { data: string; pesoPadrao: number; diaSemana: number }[] = []
  const ultimoDia = new Date(ano, mes, 0).getDate()
  for (let dia = 1; dia <= ultimoDia; dia++) {
    const date = new Date(ano, mes - 1, dia)
    const data = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    dias.push({ data, pesoPadrao: PESOS_DEFAULT[date.getDay()], diaSemana: date.getDay() })
  }
  return dias
}

export async function gerarDistribuicaoAutomatica(formData: FormData): Promise<void> {
  const ano = Number(formData.get('ano'))
  const mes = Number(formData.get('mes'))

  const supabase = await createClient()
  const { data: meta } = await supabase
    .from('metas_mensais')
    .select('*')
    .eq('ano', ano)
    .eq('mes', mes)
    .single()

  if (!meta) return

  const dias = diasDoMes(ano, mes)
  const pesos = dias.map((d) => ({ data: d.data, peso: d.pesoPadrao }))
  const cotasValor = distribuirCotaInteira(pesos, Number(meta.meta_valor))
  const cotasAtendimentos = distribuirCotaInteira(pesos, Number(meta.meta_atendimentos))
  const cotasPecas = distribuirCotaInteira(pesos, Number(meta.meta_pecas))

  const rows = dias.map((d, i) => ({
    vendedor_id: null,
    data: d.data,
    cota_valor: cotasValor[i].cota,
    cota_atendimentos: cotasAtendimentos[i].cota,
    cota_pecas: cotasPecas[i].cota,
    // Domingo entra fechado por padrão (sem cota). O gestor pode marcar como
    // "Normal" e ajustar a cota num domingo de data festiva.
    situacao: d.diaSemana === 0 ? ('fechado' as const) : ('normal' as const),
  }))

  const inicioMes = dias[0].data
  const fimMes = dias[dias.length - 1].data

  // O upsert com onConflict (vendedor_id, data) não funciona de forma
  // confiável quando vendedor_id é NULL (NULLs são distintos no índice
  // único do Postgres), então removemos as linhas existentes da loja
  // (vendedor_id IS NULL) para o período antes de inserir as novas.
  await supabase
    .from('distribuicao_diaria')
    .delete()
    .is('vendedor_id', null)
    .gte('data', inicioMes)
    .lte('data', fimMes)

  await supabase.from('distribuicao_diaria').insert(rows)

  revalidatePath('/gestor/metas')
}

export async function ajustarDiaSituacao(
  distribuicaoId: string,
  situacao: 'normal' | 'feriado' | 'fechado'
): Promise<void> {
  const supabase = await createClient()
  const update: Record<string, unknown> = { situacao }
  if (situacao !== 'normal') {
    update.cota_valor = 0
    update.cota_atendimentos = 0
    update.cota_pecas = 0
  }
  await supabase.from('distribuicao_diaria').update(update).eq('id', distribuicaoId)
  revalidatePath('/gestor/metas')
}

export async function ajustarCotaDia(
  distribuicaoId: string,
  ano: number,
  mes: number,
  formData: FormData
): Promise<void> {
  const cota_valor = Math.round(Number(formData.get('cota_valor')))
  const cota_atendimentos = Math.round(Number(formData.get('cota_atendimentos')))
  const cota_pecas = Math.round(Number(formData.get('cota_pecas')))

  const supabase = await createClient()

  const { data: meta } = await supabase
    .from('metas_mensais')
    .select('meta_valor')
    .eq('ano', ano)
    .eq('mes', mes)
    .single()

  // Se o valor digitado sozinho já ultrapassa (ou consome todo) o valor
  // da Meta Mensal, limita o dia editado à própria meta para a soma do
  // mês nunca passar da Meta Valor.
  let cotaValorFinal = cota_valor
  if (meta && cotaValorFinal > Number(meta.meta_valor)) {
    cotaValorFinal = Number(meta.meta_valor)
  }

  // Atualiza o dia editado
  await supabase
    .from('distribuicao_diaria')
    .update({ cota_valor: cotaValorFinal, cota_atendimentos, cota_pecas })
    .eq('id', distribuicaoId)

  // Recalcula os demais dias para que a soma do mês continue batendo
  // com a Meta Valor (Passo 1), redistribuindo proporcionalmente entre
  // os dias seguintes "normais" do mês (e, se não houver dias seguintes,
  // entre os demais dias normais do mês).
  if (meta) {
    const dias = diasDoMes(ano, mes)
    const inicioMes = dias[0].data
    const fimMes = dias[dias.length - 1].data

    const { data: todos } = await supabase
      .from('distribuicao_diaria')
      .select('*')
      .is('vendedor_id', null)
      .gte('data', inicioMes)
      .lte('data', fimMes)

    const diaEditado = (todos ?? []).find((d) => d.id === distribuicaoId)

    // Dias "redistribuíveis": dias normais APÓS o dia editado. Se não houver
    // dias seguintes, redistribui entre todos os demais dias normais.
    let outros = (todos ?? []).filter(
      (d) => d.id !== distribuicaoId && d.situacao === 'normal' && diaEditado && d.data > diaEditado.data
    )
    if (outros.length === 0) {
      outros = (todos ?? []).filter((d) => d.id !== distribuicaoId && d.situacao === 'normal')
    }

    const idsRedistribuiveis = new Set(outros.map((d) => d.id))

    // Soma dos dias FIXOS (não editados e não redistribuíveis): dias anteriores
    // já ajustados e dias fechados/feriado. Esses NÃO podem ser contados de novo.
    const somaFixos = (todos ?? [])
      .filter((d) => d.id !== distribuicaoId && !idsRedistribuiveis.has(d.id))
      .reduce((acc, d) => acc + Number(d.cota_valor), 0)

    // O que sobra da meta para os dias redistribuíveis.
    const restante = Math.max(Math.round(Number(meta.meta_valor)) - cotaValorFinal - somaFixos, 0)

    if (outros.length > 0) {
      const somaPesos = outros.reduce((acc, d) => acc + Number(d.cota_valor), 0)
      const pesos = outros.map((d) => ({ data: d.data, peso: somaPesos > 0 ? Number(d.cota_valor) : 1 }))
      const novas = distribuirCotaInteira(pesos, restante)
      for (let k = 0; k < outros.length; k++) {
        await supabase
          .from('distribuicao_diaria')
          .update({ cota_valor: novas[k].cota })
          .eq('id', outros[k].id)
      }
    }
  }

  revalidatePath('/gestor/metas')
}

export async function salvarPercentuaisVendedores(ano: number, mes: number, formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: vendedores } = await supabase
    .from('profiles')
    .select('id')
    .eq('perfil', 'vendedor')
    .eq('ativo', true)

  for (const v of vendedores ?? []) {
    const percentual = Number(formData.get(`pct_${v.id}`) ?? 0)
    await supabase
      .from('metas_vendedor_percentual')
      .upsert({ ano, mes, vendedor_id: v.id, percentual }, { onConflict: 'ano,mes,vendedor_id' })
  }

  revalidatePath('/gestor/metas')
}

export async function gerarDistribuicaoVendedores(formData: FormData): Promise<void> {
  const ano = Number(formData.get('ano'))
  const mes = Number(formData.get('mes'))

  const dias = diasDoMes(ano, mes)
  const inicioMes = dias[0].data
  const fimMes = dias[dias.length - 1].data

  const supabase = await createClient()

  const { data: lojaDist } = await supabase
    .from('distribuicao_diaria')
    .select('*')
    .is('vendedor_id', null)
    .gte('data', inicioMes)
    .lte('data', fimMes)

  const { data: percentuais } = await supabase
    .from('metas_vendedor_percentual')
    .select('*')
    .eq('ano', ano)
    .eq('mes', mes)

  if (!lojaDist || !percentuais || percentuais.length === 0) return

  await supabase
    .from('distribuicao_diaria')
    .delete()
    .not('vendedor_id', 'is', null)
    .gte('data', inicioMes)
    .lte('data', fimMes)

  const rows = percentuais.flatMap((p) => {
    const frac = Number(p.percentual) / 100
    return lojaDist.map((d) => ({
      vendedor_id: p.vendedor_id,
      data: d.data,
      cota_valor: Number(d.cota_valor) * frac,
      cota_atendimentos: Math.round(Number(d.cota_atendimentos) * frac),
      cota_pecas: Math.round(Number(d.cota_pecas) * frac),
      situacao: d.situacao,
    }))
  })

  if (rows.length > 0) {
    await supabase.from('distribuicao_diaria').insert(rows)
  }

  revalidatePath('/gestor/metas')
}

export async function buscarSugestaoMeta(ano: number, mes: number) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('historico_loja')
    .select('ano, venda_total')
    .eq('mes', mes)
    .in('ano', [ano - 3, ano - 2, ano - 1])

  const valores = (data ?? []).map((d) => Number(d.venda_total)).filter((v) => v > 0)
  if (valores.length === 0) return null

  // Histórico completo (todos os meses) para calcular a evolução/crescimento
  // médio da loja e sugerir a meta deste mês a partir do mesmo mês do ano
  // anterior corrigido por essa tendência.
  const { data: historicoCompleto } = await supabase
    .from('historico_loja')
    .select('ano, mes, venda_total, atendimentos, pecas')

  const hist = historicoCompleto?.map((h) => ({
    ano: h.ano,
    mes: h.mes,
    venda_total: Number(h.venda_total),
    atendimentos: Number(h.atendimentos),
    pecas: Number(h.pecas),
  }))

  const tendencia = hist ? calcularSugestaoTendencia(hist, ano, mes, 'venda_total') : null
  const tendenciaAtendimentos = hist ? calcularSugestaoTendencia(hist, ano, mes, 'atendimentos') : null
  const tendenciaPecas = hist ? calcularSugestaoTendencia(hist, ano, mes, 'pecas') : null

  return {
    sugestao: calcularSugestaoMeta(valores, tendencia, tendenciaAtendimentos, tendenciaPecas),
    historico: data,
  }
}

export async function aplicarSugestaoTendencia(formData: FormData): Promise<void> {
  const ano = Number(formData.get('ano'))
  const mes = Number(formData.get('mes'))
  const meta_valor = Number(formData.get('tendencia_valor'))
  const meta_atendimentos = Number(formData.get('tendencia_atendimentos'))
  const meta_pecas = Number(formData.get('tendencia_pecas'))

  const supabase = await createClient()
  await supabase
    .from('metas_mensais')
    .upsert(
      { ano, mes, meta_valor, meta_atendimentos: Math.round(meta_atendimentos), meta_pecas: Math.round(meta_pecas) },
      { onConflict: 'ano,mes' }
    )

  revalidatePath('/gestor/metas')
}
