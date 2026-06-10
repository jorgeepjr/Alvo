'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function criarVendedor(formData: FormData): Promise<void> {
  const nome = formData.get('nome') as string
  const email = formData.get('email') as string
  const senha = formData.get('senha') as string

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  })

  if (error) {
    throw new Error(error.message)
  }

  // O trigger handle_new_user já cria o profile com perfil 'vendedor'.
  // Garante o nome correto:
  const supabase = await createClient()
  await supabase.from('profiles').update({ nome }).eq('id', data.user.id)

  revalidatePath('/gestor/vendedores')
}

export async function alternarAtivo(vendedorId: string, ativo: boolean) {
  const supabase = await createClient()
  await supabase.from('profiles').update({ ativo }).eq('id', vendedorId)
  revalidatePath('/gestor/vendedores')
}

export async function editarVendedor(vendedorId: string, formData: FormData): Promise<void> {
  const nome = formData.get('nome') as string
  const email = formData.get('email') as string
  const senha = formData.get('senha') as string

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const updates: { email?: string; password?: string; user_metadata?: { nome: string } } = {
    user_metadata: { nome },
  }
  if (email) updates.email = email
  if (senha) updates.password = senha

  const { error } = await admin.auth.admin.updateUserById(vendedorId, updates)
  if (error) {
    throw new Error(error.message)
  }

  const supabase = await createClient()
  await supabase.from('profiles').update({ nome }).eq('id', vendedorId)

  revalidatePath('/gestor/vendedores')
}
