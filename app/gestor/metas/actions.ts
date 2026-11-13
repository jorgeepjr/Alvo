'use server'

import { createClient } from '@/lib/supabase/server'
import { distribuirCotaInteira, distribuirCotaRedonda, dividirEntreVendedores, calcularSugestaoMeta, calcularSugestaoTendencia } from '@/lib/calculos'
import { revalidatePath } from 'next/cache'
import { pesosAnoPassado } from '@/lib/cota-ano-passado'
import { vendaDiariaDoMes } from '@/lib/dados-mes'
import { hojeBR } from '@/lib/datas'
import type { SupabaseClient } from '@supabase/supabase-js'

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
  const super_meta_valor = Math.max(Math.round(Number(formData.get('super_meta_valor')) || 0), 0)
  const super_meta_premio = ((formData.get('super_meta_premio') as string) || '').trim()

  const supabase = await createClient()
  await supabase
    .from('metas_mensais')
    .upsert({ ano, mes, meta_valor, meta_atendimentos, meta_pecas, super_meta_valor, super_meta_premio }, { onConflict: 'ano,mes' })

  // Meta mudou: os dias livres (não salvos e que ainda não passaram) são recalculados.
  await rebalancearMes(supabase, ano, mes)
  await distribuirParaVendedores(supabase, ano, mes)

  revalidatePath('/gestor/metas')
  revalidatePath('/gestor')
  revalidatePath('/painel')
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

type SupabaseSrv = Awaited<ReturnType<typeof createClient>>

// Rebalanceia a distribuição da loja no mês:
// - dias FIXOS (salvos pelo gestor, feriado/fechado) não mudam;
// - dias que já passaram não mudam (o "onde deveria estar" fica estável);
// - com `depoisDe`, só os dias DEPOIS dele recebem a diferença (salvar um dia
//   não mexe nos anteriores — regra do Junior, 12/11/2026);
// - o que falta pra meta vai pros dias livres pelo peso do ano passado
//   (mesmo dia da semana, 364 dias antes; a sobra vai pro último dia);
// - valores em R$ 100, e o último dia livre absorve o arredondamento.
async function rebalancearMes(supabase: SupabaseSrv, ano: number, mes: number, opts: { depoisDe?: string; todos?: boolean } = {}): Promise<void> {
  const dias = diasDoMes(ano, mes)
  const { data: meta } = await supabase
    .from('metas_mensais')
    .select('meta_valor, meta_atendimentos, meta_pecas')
    .eq('ano', ano)
    .eq('mes', mes)
    .single()
  if (!meta) return

  const { data: todos } = await supabase
    .from('distribuicao_diaria')
    .select('*')
    .is('vendedor_id', null)
    .gte('data', dias[0].data)
    .lte('data', dias[dias.length - 1].data)
    .order('data')
  const linhas = todos ?? []

  const hoje = hojeBR()
  const naoSalvos = linhas.filter((d) => d.situacao === 'normal' && !d.cota_fixada)
  const candidatos = [
    naoSalvos.filter((d) => opts.todos || ((!opts.depoisDe || d.data > opts.depoisDe) && d.data >= hoje)),
    naoSalvos.filter((d) => !opts.depoisDe || d.data > opts.depoisDe),
    naoSalvos,
  ]
  // Se não sobrar dia livre depois do corte, usa o que tiver (a soma precisa fechar na meta).
  const livres = candidatos.find((c) => c.length > 0) ?? []
  if (livres.length === 0) return
  const idsLivres = new Set(livres.map((d) => d.id))
  const fixos = linhas.filter((d) => !idsLivres.has(d.id))
  const soma = (campo: 'cota_valor' | 'cota_atendimentos' | 'cota_pecas') =>
    fixos.filter((d) => d.situacao === 'normal').reduce((acc, d) => acc + Number(d[campo] ?? 0), 0)

  const mm = String(mes).padStart(2, '0')
  const vendaLY = await vendaDiariaDoMes(supabase as unknown as SupabaseClient, `${ano - 1}-${mm}`)
  const W = pesosAnoPassado(linhas.map((d) => ({ data: d.data, situacao: d.situacao })), vendaLY)
  const pesos = livres.map((d) => ({ data: d.data, peso: W[d.data] || 1 }))
  const valor = distribuirCotaRedonda(pesos, Math.max(Math.round(Number(meta.meta_valor)) - soma('cota_valor'), 0), 100)
  const atend = distribuirCotaInteira(pesos, Math.max(Number(meta.meta_atendimentos) - soma('cota_atendimentos'), 0))
  const pecas = distribuirCotaInteira(pesos, Math.max(Number(meta.meta_pecas) - soma('cota_pecas'), 0))

  for (let k = 0; k < livres.length; k++) {
    await supabase
      .from('distribuicao_diaria')
      .update({ cota_valor: valor[k].cota, cota_atendimentos: atend[k].cota, cota_pecas: pecas[k].cota })
      .eq('id', livres[k].id)
  }
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
  const rows = dias.map((d) => ({
    vendedor_id: null,
    data: d.data,
    cota_valor: 0,
    cota_atendimentos: 0,
    cota_pecas: 0,
    cota_fixada: false,
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

  // Preenche os dias (todos livres) com valores redondos que somam a meta.
  await rebalancearMes(supabase, ano, mes, { todos: true })

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

  // Normal: o dia volta a ser livre e recebe parte do que falta para a meta.
  // Feriado/fechado: o dia é zerado e a cota dele vai para os dias não salvos.
  await supabase
    .from('distribuicao_diaria')
    .update({ situacao, cota_fixada: false, cota_valor: 0, cota_atendimentos: 0, cota_pecas: 0 })
    .eq('id', distribuicaoId)

  await rebalancearMes(supabase, ano, mes, situacao === 'normal' ? {} : { depoisDe: dia.data })
  await distribuirParaVendedores(supabase, ano, mes)
  revalidatePath('/gestor/metas')
}

// Salvar a cota de um dia FIXA esse dia (o valor digitado não muda mais).
// O que falta para a meta é redistribuído só entre os dias ainda não salvos.
export async function ajustarCotaDia(
  distribuicaoId: string,
  ano: number,
  mes: number,
  formData: FormData
): Promise<void> {
  const cota_valor = Math.max(Math.round(Number(formData.get('cota_valor'))), 0)
  const cota_atendimentos = Math.max(Math.round(Number(formData.get('cota_atendimentos'))), 0)
  const cota_pecas = Math.max(Math.round(Number(formData.get('cota_pecas'))), 0)

  const supabase = await createClient()

  const { data: dia } = await supabase
    .from('distribuicao_diaria')
    .update({ cota_valor, cota_atendimentos, cota_pecas, cota_fixada: true })
    .eq('id', distribuicaoId)
    .select('data')
    .maybeSingle()

  await rebalancearMes(supabase, ano, mes, { depoisDe: dia?.data })
  await distribuirParaVendedores(supabase, ano, mes)
  revalidatePath('/gestor/metas')
}

// Solta a trava de um dia salvo: ele volta a receber o recálculo automático.
export async function liberarDia(distribuicaoId: string, ano: number, mes: number): Promise<void> {
  const supabase = await createClient()
  await supabase.from('distribuicao_diaria').update({ cota_fixada: false }).eq('id', distribuicaoId)
  await rebalancearMes(supabase, ano, mes)
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

  // Divide cada dia entre os vendedores sem sobrar nem passar do total da loja.
  // Quando o dia não divide certo (ex.: 9 meio a meio), a unidade extra vai
  // para um vendedor de cada vez — o giro só anda nos dias que tiveram sobra,
  // para ninguém ficar com mais extras que o outro no mês.
  const pcts = percentuais.map((p) => Number(p.percentual))
  const somaPcts = pcts.reduce((a, b) => a + b, 0)
  const lojaOrdenada = [...lojaDist].sort((a, b) => String(a.data).localeCompare(String(b.data)))
  const giro = { valor: 0, atend: 0, pecas: 0 }
  const dividir = (total: number, campo: keyof typeof giro) => {
    const t = Math.round(total)
    const partes = dividirEntreVendedores(t, pcts, giro[campo])
    const temSobra = somaPcts > 0 && pcts.some((p) => !Number.isInteger(Math.round(((p / somaPcts) * t) * 1e6) / 1e6))
    if (temSobra) giro[campo]++
    return partes
  }
  const rows = lojaOrdenada.flatMap((d) => {
    const valor = dividir(Number(d.cota_valor), 'valor')
    const atend = dividir(Number(d.cota_atendimentos), 'atend')
    const pecas = dividir(Number(d.cota_pecas), 'pecas')
    return percentuais.map((p, i) => ({
      vendedor_id: p.vendedor_id,
      data: d.data,
      cota_valor: valor[i],
      cota_atendimentos: atend[i],
      cota_pecas: pecas[i],
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

    // Regra do Junior: mesmo mês do ano passado +20% (valor em R$ 100 redondos).
    const base = hist.find((h) => h.ano === ano - 1 && h.mes === mes)
    if (!base || base.venda_total <= 0) continue // sem base do ano anterior → não cria

    await supabase.from('metas_mensais').upsert(
      {
        ano,
        mes,
        meta_valor: Math.round((base.venda_total * 1.2) / 100) * 100,
        meta_atendimentos: Math.round(base.atendimentos * 1.2),
        meta_pecas: Math.round(base.pecas * 1.2),
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

// "Usar →" da sugestão (mesmo mês do ano passado +20%): grava a meta e já
// distribui pelos dias como o ano passado. Se o mês já tem distribuição, só
// recalcula os dias livres (os salvos 📌 e os que já passaram não mudam).
export async function usarSugestaoAnoPassado(ano: number, mes: number, valor: number, atendimentos: number, pecas: number): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('metas_mensais')
    .upsert({ ano, mes, meta_valor: Math.round(valor), meta_atendimentos: Math.round(atendimentos), meta_pecas: Math.round(pecas) }, { onConflict: 'ano,mes' })
  const mm = String(mes).padStart(2, '0')
  const { count } = await supabase
    .from('distribuicao_diaria')
    .select('id', { count: 'exact', head: true })
    .is('vendedor_id', null)
    .gte('data', `${ano}-${mm}-01`)
    .lte('data', `${ano}-${mm}-${new Date(ano, mes, 0).getDate()}`)
  if (!count) {
    const fd = new FormData()
    fd.set('ano', String(ano))
    fd.set('mes', String(mes))
    await gerarDistribuicaoAutomatica(fd)
  } else {
    await rebalancearMes(supabase, ano, mes)
    await distribuirParaVendedores(supabase, ano, mes)
  }
  revalidatePath('/gestor/metas')
  revalidatePath('/gestor')
}
