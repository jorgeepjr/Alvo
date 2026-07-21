'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function salvarNiveis(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: niveis } = await supabase.from('gam_niveis').select('id').order('ordem')

  for (const n of niveis ?? []) {
    const nome = ((formData.get(`nome_${n.id}`) as string) || '').trim()
    const ptsMin = Number(formData.get(`pts_min_${n.id}`)) || 0
    const ptsMaxRaw = (formData.get(`pts_max_${n.id}`) as string) || ''
    const pts_max = ptsMaxRaw.trim() === '' ? null : Number(ptsMaxRaw)
    const beneficio = ((formData.get(`beneficio_${n.id}`) as string) || '').trim()

    await supabase
      .from('gam_niveis')
      .update({ nome: nome || `Nível ${n.id}`, pts_min: ptsMin, pts_max, beneficio })
      .eq('id', n.id)
  }

  revalidatePath('/gestor/gamificacao')
  revalidatePath('/painel/desempenho')
}
