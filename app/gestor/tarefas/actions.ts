'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function criarTarefa(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const data = formData.get('data') as string
  const descricao = formData.get('descricao') as string
  const vendedorIdRaw = formData.get('vendedor_id') as string
  const vendedor_id = vendedorIdRaw === 'todos' ? null : vendedorIdRaw

  if (!descricao) return

  await supabase.from('tarefas').insert({
    vendedor_id,
    data,
    descricao,
    criado_por: user.id,
  })

  revalidatePath('/gestor/tarefas')
  revalidatePath('/painel')
}

export async function excluirTarefa(tarefaId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('tarefas').delete().eq('id', tarefaId)
  revalidatePath('/gestor/tarefas')
  revalidatePath('/painel')
}

export async function alternarConclusaoTarefa(tarefaId: string, concluida: boolean): Promise<void> {
  const supabase = await createClient()
  await supabase.from('tarefas').update({ concluida }).eq('id', tarefaId)
  revalidatePath('/gestor/tarefas')
  revalidatePath('/painel')
}

export async function alternarItemRotina(itemId: string, data: string, concluido: boolean): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  if (concluido) {
    await supabase.from('rotina_concluida').insert({ vendedor_id: user.id, data, item_id: itemId })
  } else {
    await supabase.from('rotina_concluida').delete().eq('vendedor_id', user.id).eq('data', data).eq('item_id', itemId)
  }

  revalidatePath('/painel')
}
