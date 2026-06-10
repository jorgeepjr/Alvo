'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function salvarLancamentoVendedor(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const data = formData.get('data') as string
  const atendimentos = Number(formData.get('atendimentos'))
  const pecas = Number(formData.get('pecas'))
  const valor = Number(formData.get('valor'))
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

  if (existente) {
    await supabase
      .from('lancamentos')
      .update({ atendimentos, pecas, valor, observacao, situacao_vendedor })
      .eq('id', existente.id)
  } else {
    await supabase.from('lancamentos').insert({
      vendedor_id: user.id,
      data,
      atendimentos,
      pecas,
      valor,
      observacao,
      situacao_vendedor,
      criado_por: user.id,
    })
  }

  revalidatePath('/painel/lancamento')
  revalidatePath('/painel')
  return { success: true }
}
