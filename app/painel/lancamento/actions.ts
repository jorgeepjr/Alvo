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
