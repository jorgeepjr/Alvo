'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { atualizarHistoricoMes } from '@/lib/historico'
import { parseValorBR } from '@/lib/valor'

export async function salvarLancamentoVendedor(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const data = formData.get('data') as string
  const atendimentos = Number(formData.get('atendimentos'))
  const vendas = Number(formData.get('vendas')) || 0
  const pecas = Number(formData.get('pecas'))
  const valor = parseValorBR(formData.get('valor'))
  const observacao = (formData.get('observacao') as string) || null
  const situacao_vendedor = (formData.get('situacao_vendedor') as string) || 'normal'

  const { data: existente } = await supabase
    .from('lancamentos')
    .select('id, dia_fechado')
    .eq('data', data)
    .eq('vendedor_id', user.id)
    .maybeSingle()

  if (existente?.dia_fechado) {
    return { error: 'O gestor fechou este dia. Não é possível editar.' }
  }

  const { data: distribuicaoDia } = await supabase
    .from('distribuicao_diaria')
    .select('situacao')
    .eq('data', data)
    .is('vendedor_id', null)
    .maybeSingle()

  if (distribuicaoDia?.situacao === 'feriado' || distribuicaoDia?.situacao === 'fechado') {
    return { error: 'Este dia está marcado como feriado/fechado. Não é possível lançar vendas.' }
  }

  if (existente) {
    await supabase
      .from('lancamentos')
      .update({ atendimentos, vendas, pecas, valor, observacao, situacao_vendedor })
      .eq('id', existente.id)
  } else {
    await supabase.from('lancamentos').insert({
      vendedor_id: user.id,
      data,
      atendimentos,
      vendas,
      pecas,
      valor,
      observacao,
      situacao_vendedor,
      criado_por: user.id,
    })
  }

  await atualizarHistoricoMes(supabase, data)

  revalidatePath('/painel/lancamento')
  revalidatePath('/painel')
  revalidatePath('/gestor/historico')
  return { success: true }
}

// Modo acumulativo: cada venda lançada SOMA ao total já registrado no dia.
export async function adicionarVendaRapida(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const data = formData.get('data') as string
  const atendimentos = Number(formData.get('atendimentos')) || 0
  const vendas = Number(formData.get('vendas')) || 0
  const pecas = Number(formData.get('pecas')) || 0
  const valor = parseValorBR(formData.get('valor'))

  if (atendimentos === 0 && pecas === 0 && valor === 0 && vendas === 0) {
    return { error: 'Informe pelo menos um valor para adicionar.' }
  }

  const { data: existente } = await supabase
    .from('lancamentos')
    .select('id, dia_fechado, atendimentos, vendas, pecas, valor')
    .eq('data', data)
    .eq('vendedor_id', user.id)
    .maybeSingle()

  if (existente?.dia_fechado) {
    return { error: 'O gestor fechou este dia. Não é possível lançar.' }
  }

  const { data: distribuicaoDia } = await supabase
    .from('distribuicao_diaria')
    .select('situacao')
    .eq('data', data)
    .is('vendedor_id', null)
    .maybeSingle()

  if (distribuicaoDia?.situacao === 'feriado' || distribuicaoDia?.situacao === 'fechado') {
    return { error: 'Este dia está marcado como feriado/fechado. Não é possível lançar vendas.' }
  }

  if (existente) {
    await supabase
      .from('lancamentos')
      .update({
        atendimentos: (existente.atendimentos ?? 0) + atendimentos,
        vendas: (existente.vendas ?? 0) + vendas,
        pecas: (existente.pecas ?? 0) + pecas,
        valor: Number(existente.valor ?? 0) + valor,
      })
      .eq('id', existente.id)
  } else {
    await supabase.from('lancamentos').insert({
      vendedor_id: user.id,
      data,
      atendimentos,
      vendas,
      pecas,
      valor,
      situacao_vendedor: 'normal',
      criado_por: user.id,
    })
  }

  await atualizarHistoricoMes(supabase, data)

  revalidatePath('/painel')
  revalidatePath('/painel/lancamento')
  revalidatePath('/gestor/historico')
  return { success: true }
}

// ── Venda por venda (repaginada 12/11/2026) ─────────────────────────────────
// O vendedor registra cada venda só no dia de hoje. Cada venda = 1 atendimento.
// O lançamento do dia é a soma das vendas — a não ser que o gestor já tenha
// corrigido o dia pelo fechamento de caixa (aí o número dele é o oficial).

async function somarDia(supabase: Awaited<ReturnType<typeof createClient>>, vendedorId: string, data: string) {
  const { data: vendas } = await supabase.from('vendas').select('pecas, valor, whatsapp').eq('vendedor_id', vendedorId).eq('data', data)
  const { data: lanc } = await supabase.from('lancamentos').select('id, corrigido_por, dia_fechado').eq('vendedor_id', vendedorId).eq('data', data).maybeSingle()
  if (lanc?.corrigido_por || lanc?.dia_fechado) return
  const X = vendas ?? []
  const tot = {
    atendimentos: X.length,
    pecas: X.reduce((a, s) => a + s.pecas, 0),
    valor: Math.round(X.reduce((a, s) => a + Number(s.valor), 0) * 100) / 100,
    valor_whatsapp: Math.round(X.filter((s) => s.whatsapp).reduce((a, s) => a + Number(s.valor), 0) * 100) / 100,
  }
  if (lanc && !X.length) await supabase.from('lancamentos').delete().eq('id', lanc.id)
  else if (lanc) await supabase.from('lancamentos').update(tot).eq('id', lanc.id)
  else if (X.length) await supabase.from('lancamentos').insert({ vendedor_id: vendedorId, data, ...tot, situacao_vendedor: 'normal', criado_por: vendedorId })
}

export async function registrarVenda(
  _prev: { error?: string; ok?: string } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }
  const { hojeBR, horaBR } = await import('@/lib/datas')
  const data = hojeBR()
  const pecas = Math.round(Number(formData.get('pecas')) || 0)
  const valor = parseValorBR(formData.get('valor'))
  if (pecas <= 0 || valor <= 0) return { error: 'Preencha peças e valor.' }

  const { data: dist } = await supabase.from('distribuicao_diaria').select('situacao').eq('data', data).is('vendedor_id', null).maybeSingle()
  if (dist?.situacao === 'feriado' || dist?.situacao === 'fechado') return { error: 'Hoje está marcado como feriado/fechado. Fale com o gestor.' }

  const { error } = await supabase.from('vendas').insert({ vendedor_id: user.id, data, hora: horaBR(), pecas, valor, whatsapp: formData.get('origem') === 'whatsapp' })
  if (error) return { error: 'Não consegui registrar. Tente de novo.' }
  await somarDia(supabase, user.id, data)
  revalidatePath('/painel')
  revalidatePath('/painel/lancamento')
  revalidatePath('/gestor')
  return { ok: `Venda registrada: R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }
}

export async function apagarVenda(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { hojeBR } = await import('@/lib/datas')
  const data = hojeBR()
  // Só dá pra apagar venda de hoje (o banco também bloqueia).
  await supabase.from('vendas').delete().eq('id', id).eq('vendedor_id', user.id).eq('data', data)
  await somarDia(supabase, user.id, data)
  revalidatePath('/painel')
  revalidatePath('/painel/lancamento')
  revalidatePath('/gestor')
}
