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

export async function salvarConfigPontos(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const num = (k: string, d: number) => {
    const v = Number(formData.get(k))
    return Number.isFinite(v) ? v : d
  }
  await supabase
    .from('gam_config')
    .update({
      pts_meta: num('pts_meta', 200),
      pts_dia: num('pts_dia', 10),
      pts_rotina: num('pts_rotina', 1),
      pts_streak: num('pts_streak', 5),
      conv_alta_min: num('conv_alta_min', 60),
      pts_conv_alta: num('pts_conv_alta', 60),
      conv_media_min: num('conv_media_min', 45),
      pts_conv_media: num('pts_conv_media', 40),
      conv_baixa_min: num('conv_baixa_min', 30),
      pts_conv_baixa: num('pts_conv_baixa', 20),
    })
    .eq('id', 1)

  revalidatePath('/gestor/gamificacao')
  revalidatePath('/painel/desempenho')
}

export async function criarDesafio(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const titulo = ((formData.get('titulo') as string) || '').trim()
  const descricao = ((formData.get('descricao') as string) || '').trim() || null
  const tipo = (formData.get('tipo') as string) || 'valor'
  const alvo = Number(formData.get('alvo')) || 0
  const pontos = Number(formData.get('pontos')) || 0
  const data_inicio = formData.get('data_inicio') as string
  const data_fim = formData.get('data_fim') as string
  if (!titulo || !data_inicio || !data_fim) return

  await supabase.from('gam_desafios').insert({ titulo, descricao, tipo, alvo, pontos, data_inicio, data_fim, ativo: true })
  revalidatePath('/gestor/gamificacao')
  revalidatePath('/painel/desempenho')
}

export async function excluirDesafio(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('gam_desafios').delete().eq('id', id)
  revalidatePath('/gestor/gamificacao')
  revalidatePath('/painel/desempenho')
}
