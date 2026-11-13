'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const dia = (v: FormDataEntryValue | null, padrao: number) => {
  const n = Math.round(Number(v))
  return n >= 1 && n <= 31 ? n : padrao
}

// Dias das 2 avaliações do mês (meio do mês e reta final).
export async function salvarAvaliacoes(formData: FormData): Promise<void> {
  const aval_meio = dia(formData.get('aval_meio'), 15)
  const aval_final_ini = dia(formData.get('aval_final_ini'), 20)
  const aval_final_fim = Math.max(aval_final_ini, dia(formData.get('aval_final_fim'), 25))
  const supabase = await createClient()
  await supabase.from('gam_config').update({ aval_meio, aval_final_ini, aval_final_fim }).eq('id', 1)
  revalidatePath('/gestor/ajustes')
  revalidatePath('/gestor')
}
