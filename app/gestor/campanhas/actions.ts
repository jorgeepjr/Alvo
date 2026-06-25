'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function criarCampanha(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const mes = Number(formData.get('mes'))
  const titulo = ((formData.get('titulo') as string) || '').trim()
  const descricao = ((formData.get('descricao') as string) || '').trim() || null
  if (!titulo || mes < 1 || mes > 12) return

  await supabase.from('campanhas').insert({ mes, titulo, descricao, status: 'ideia' })
  revalidatePath('/gestor/campanhas')
  revalidatePath('/gestor')
}

export async function mudarStatusCampanha(id: string, status: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('campanhas').update({ status }).eq('id', id)
  revalidatePath('/gestor/campanhas')
  revalidatePath('/gestor')
}

export async function excluirCampanha(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('campanhas').delete().eq('id', id)
  revalidatePath('/gestor/campanhas')
  revalidatePath('/gestor')
}
