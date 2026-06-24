'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { atualizarHistoricoMes } from '@/lib/historico'
import { parseValorBR } from '@/lib/valor'

export async function salvarLancamentoGestor(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const data = formData.get('data') as string
  const vendedorIdRaw = formData.get('vendedor_id') as string
  const vendedor_id = vendedorIdRaw === 'loja' ? null : vendedorIdRaw
  const atendimentos = Number(formData.get('atendimentos'))
  const pecas = Number(formData.get('pecas'))
  const valor = parseValorBR(formData.get('valor'))
  const observacao = (formData.get('observacao') as string) || null
  const situacao_vendedor = (formData.get('situacao_vendedor') as string) || 'normal'

  let query = supabase.from('lancamentos').select('id').eq('data', data)
  query = vendedor_id === null ? query.is('vendedor_id', null) : query.eq('vendedor_id', vendedor_id)
  const { data: existente } = await query.maybeSingle()

  if (existente) {
    await supabase
      .from('lancamentos')
      .update({ atendimentos, pecas, valor, observacao, situacao_vendedor })
      .eq('id', existente.id)
  } else {
    await supabase.from('lancamentos').insert({
      vendedor_id,
      data,
      atendimentos,
      pecas,
      valor,
      observacao,
      situacao_vendedor,
      criado_por: user.id,
    })
  }

  await atualizarHistoricoMes(supabase, data)

  revalidatePath('/gestor/lancamento')
  revalidatePath('/gestor')
  revalidatePath('/painel')
  revalidatePath('/gestor/historico')
}

export async function salvarNotaDia(data: string, formData: FormData): Promise<void> {
  const supabase = await createClient()
  const motivo = ((formData.get('motivo') as string) || '').trim()
  if (motivo) {
    await supabase.from('dia_nota').upsert({ data, motivo, atualizado_em: new Date().toISOString() }, { onConflict: 'data' })
  } else {
    await supabase.from('dia_nota').delete().eq('data', data)
  }
  revalidatePath('/gestor/lancamento')
}

export async function fecharDia(data: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('lancamentos').update({ dia_fechado: true }).eq('data', data)
  await supabase.from('distribuicao_diaria').update({ situacao: 'fechado' }).eq('data', data).is('vendedor_id', null)
  revalidatePath('/gestor/lancamento')
  revalidatePath('/painel/lancamento')
}
