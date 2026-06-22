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

  // Mantém as cotas dos vendedores em dia com a nova distribuição da loja.
  await distribuirParaVendedores(supabase, ano, mes)

  revalidatePath('/gestor/metas')
}

export async function ajustarDiaSituacao(
  distribuicaoId: string,
  situacao: 'normal' | 'feriado' | 'fechado'
): Promise<void> {
  const supabase = await createClient()

  const { data: dia } = await supabase
    .from('distribuicao_diaria')
    .select('*')
    .eq('id', distribuicaoId)
    .single()
  if (!dia) return

  const [ano, mes] = dia.data.split('-').map(Number)

  if (situacao === 'normal') {
    // Reabrir o dia: só muda a situação (o gestor define a cota depois).
    await supabase.from('distribuicao_diaria').update({ situacao: 'normal' }).eq('id', distribuicaoId)
    await distribuirParaVendedores(supabase, ano, mes)
    revalidatePath('/gestor/metas')
    return
  }

  // Feriado/fechado: zera o dia e redistribui a cota dele entre os demais
  // dias normais do mês, para a soma continuar batendo com a meta.
  const removidoValor = Number(dia.cota_valor)
  const removidoAtend = Number(dia.cota_atendimentos)
  const removidoPecas = Number(dia.cota_pecas)

  await supabase
    .from('distribuicao_diaria')
    .update({ situacao, cota_valor: 0, cota_atendimentos: 0, cota_pecas: 0 })
    .eq('id', distribuicaoId)

  const dias = diasDoMes(ano, mes)
  const { data: todos } = await supabase
    .from('distribuicao_diaria')
    .select('*')
    .is('vendedor_id', null)
    .gte('data', dias[0].data)
    .lte('data', dias[dias.length - 1].data)

  const outros = (todos ?? []).filter((d) => d.id !== distribuicaoId && d.situacao === 'normal')

  if (outros.length > 0) {
    const redistribuir = (campo: 'cota_valor' | 'cota_atendimentos' | 'cota_pecas', removido: number) => {
      const somaAtual = outros.reduce((acc, d) => acc + Number(d[campo]), 0)
      const pesos = outros.map((d) => ({ data: d.data, peso: somaAtual > 0 ? Number(d[campo]) : 1 }))
      return distribuirCotaInteira(pesos, somaAtual + removido)
    }
    const novosValor = redistribuir('cota_valor', removidoValor)
    const novosAtend = redistribuir('cota_atendimentos', removidoAtend)
    const novosPecas = redistribuir('cota_pecas', removidoPecas)

    for (let k = 0; k < outros.length; k++) {
      await supabase
        .from('distribuicao_diaria')
        .update({
          cota_valor: novosValor[k].cota,
          cota_atendimentos: novosAtend[k].cota,
          cota_pecas: novosPecas[k].cota,
        })
        .eq('id', outros[k].id)
    }
  }

  await distribuirParaVendedores(supabase, ano, mes)
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

  await distribuirParaVendedores(supabase, ano, mes)
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

type SupabaseSrv = Awaited<ReturnType<typeof createClient>>

// Regera a distribuição por vendedor a partir da distribuição da loja e dos
// percentuais. Usado tanto pelo botão quanto automaticamente ao gerar/editar
// a distribuição da loja, para manter as cotas dos vendedores sempre em dia.
async function distribuirParaVendedores(supabase: SupabaseSrv, ano: number, mes: number): Promise<void> {
  const dias = diasDoMes(ano, mes)
  const inicioMes = dias[0].data
  const fimMes = dias[dias.length - 1].data

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
      cota_valor: Math.round(Number(d.cota_valor) * frac),
      cota_atendimentos: Math.round(Number(d.cota_atendimentos) * frac),
      cota_pecas: Math.round(Number(d.cota_pecas) * frac),
      situacao: d.situacao,
    }))
  })

  if (rows.length > 0) {
    await supabase.from('distribuicao_diaria').insert(rows)
  }
}

export async function gerarDistribuicaoVendedores(formData: FormData): Promise<void> {
  const ano = Number(formData.get('ano'))
  const mes = Number(formData.get('mes'))
  const supabase = await createClient()
  await distribuirParaVendedores(supabase, ano, mes)

  revalidatePath('/gestor/metas')
}

// Calcula e preenche automaticamente as metas dos próximos 12 meses com base
// no histórico (tendência: mesmo mês do ano anterior × crescimento médio da
// loja). Não sobrescreve metas já definidas manualmente.
export async function gerarMetasFuturas(formData: FormData): Promise<{ criadas: number }> {
  const anoBase = Number(formData.get('ano'))
  const mesBase = Number(formData.get('mes'))
  const supabase = await createClient()

  const { data: historicoCompleto } = await supabase
    .from('historico_loja')
    .select('ano, mes, venda_total, atendimentos, pecas')

  const hist = (historicoCompleto ?? []).map((h) => ({
    ano: h.ano,
    mes: h.mes,
    venda_total: Number(h.venda_total),
    atendimentos: Number(h.atendimentos),
    pecas: Number(h.pecas),
  }))

  const { data: metasExistentes } = await supabase.from('metas_mensais').select('ano, mes')
  const jaTem = new Set((metasExistentes ?? []).map((m) => `${m.ano}-${m.mes}`))

  let criadas = 0
  for (let k = 0; k < 12; k++) {
    const total = (mesBase - 1) + k
    const ano = anoBase + Math.floor(total / 12)
    const mes = (total % 12) + 1
    if (jaTem.has(`${ano}-${mes}`)) continue

    const tendencia = calcularSugestaoTendencia(hist, ano, mes, 'venda_total')
    if (tendencia === null) continue // sem base do ano anterior → não cria
    const tAtend = calcularSugestaoTendencia(hist, ano, mes, 'atendimentos')
    const tPecas = calcularSugestaoTendencia(hist, ano, mes, 'pecas')

    await supabase.from('metas_mensais').upsert(
      {
        ano,
        mes,
        meta_valor: Math.round(tendencia),
        meta_atendimentos: Math.round(tAtend ?? 0),
        meta_pecas: Math.round(tPecas ?? 0),
      },
      { onConflict: 'ano,mes' }
    )
    criadas++
  }

  revalidatePath('/gestor/metas')
  return { criadas }
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
