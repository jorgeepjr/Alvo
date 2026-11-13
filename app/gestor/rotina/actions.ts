'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { hojeBR } from '@/lib/datas'

const MAX = 5

function revalidar() {
  revalidatePath('/gestor/rotina')
  revalidatePath('/painel')
}

export async function salvarHabito(id: string, formData: FormData): Promise<void> {
  const texto = String(formData.get('texto') ?? '').trim()
  if (!texto) return
  const supabase = await createClient()
  await supabase.from('habitos').update({ texto }).eq('id', id)
  revalidar()
}

export async function adicionarHabito(): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase.from('habitos').select('ordem').eq('ativo', true)
  if ((data?.length ?? 0) >= MAX) return
  const ordem = Math.max(0, ...(data ?? []).map((h) => h.ordem)) + 1
  await supabase.from('habitos').insert({ texto: 'Novo hábito', ordem })
  revalidar()
}

// Tirar um hábito só desliga (ativo = false): o histórico de quem fez fica guardado.
export async function tirarHabito(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('habitos').update({ ativo: false }).eq('id', id)
  revalidar()
}

// Vendedor marca/desmarca um hábito de hoje.
export async function alternarHabito(habitoId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const data = hojeBR()
  const { data: ja } = await supabase.from('habitos_feitos').select('id').eq('habito_id', habitoId).eq('vendedor_id', user.id).eq('data', data).maybeSingle()
  if (ja) await supabase.from('habitos_feitos').delete().eq('id', ja.id)
  else await supabase.from('habitos_feitos').insert({ habito_id: habitoId, vendedor_id: user.id, data })
  revalidar()
}
