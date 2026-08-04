'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function salvarConfigComissao(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const num = (k: string, d: number) => {
    const v = Number(formData.get(k))
    return Number.isFinite(v) && v >= 0 ? v : d
  }
  await supabase
    .from('gam_config')
    .update({ com_pct_meta: num('com_pct_meta', 2), com_pct_sem: num('com_pct_sem', 1) })
    .eq('id', 1)

  revalidatePath('/gestor/comissoes')
  revalidatePath('/painel/desempenho')
}
