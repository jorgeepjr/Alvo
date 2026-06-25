'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { chamarGemini } from '@/lib/gemini'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export async function gerarEstrategiaCampanha(id: string): Promise<{ estrategia?: string; error?: string }> {
  const supabase = await createClient()
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { error: 'IA não configurada (GEMINI_API_KEY).' }

  const { data: c } = await supabase.from('campanhas').select('titulo, mes, descricao').eq('id', id).maybeSingle()
  if (!c) return { error: 'Campanha não encontrada.' }

  try {
    const texto = await chamarGemini(
      apiKey,
      `Você é o estrategista de marketing da ZYNK, loja de moda masculina (visual sofisticado e minimalista). Crie um plano de campanha pronto para executar, em português do Brasil, curto e prático.
Estruture assim:
1. Objetivo da campanha (1 frase).
2. Mecânica / oferta (o que o cliente ganha — ex: combo, brinde, condicional, desconto progressivo).
3. Conteúdo para Instagram (3 ideias de post/story/reel com tema e CTA).
4. Mensagem de WhatsApp pronta para disparar (no tom de áudio, informal e personalizável com [Nome]).
5. Ação na loja (vitrine/ambiente).
Seja específico e realista para uma loja de rua. Não invente datas além do mês informado.`,
      [{ role: 'user', content: `Campanha: "${c.titulo}" — mês: ${MESES[c.mes - 1]}. Contexto: ${c.descricao ?? ''}` }]
    )
    await supabase.from('campanhas').update({ estrategia: texto }).eq('id', id)
    revalidatePath('/gestor/campanhas')
    return { estrategia: texto }
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'SOBRECARREGADO') return { error: 'A IA está sobrecarregada agora. Tente em 1 minuto.' }
    if (msg === 'LIMITE_EXCEDIDO') return { error: 'Limite gratuito da IA atingido. Tente mais tarde.' }
    return { error: `Não foi possível gerar a estratégia (${msg || 'erro'}).` }
  }
}

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
