'use server'

import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

const SYSTEM_PROMPT = `Você é o assistente de vendas de uma loja de roupas (moda feminina).
Seu papel é ajudar vendedores e a gestora a venderem mais, com sugestões práticas e criativas:
- Ideias de campanhas e promoções (condicionais, combos, queima de estoque, datas comemorativas).
- Ideias de conteúdo para Instagram/TikTok: roteiros de vídeos/reels curtos, temas de stories, "produto do dia".
- Dicas de abordagem, pós-venda e fidelização de clientes.
- Sugestões de combinações de looks/peças para vender mais por cliente (aumentar peças por atendimento e ticket médio).

Responda sempre em português do Brasil, de forma direta, prática e organizada (use listas curtas).
Quando sugerir um vídeo, descreva: tema, roteiro rápido (passo a passo) e duração sugerida.
Se faltar contexto (ex: tipo de peça, época do ano, estoque parado), pergunte de forma breve ou assuma um cenário razoável e avise que é um exemplo.`

export async function enviarMensagemAssistente(
  historico: ChatMessage[]
): Promise<{ resposta?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { error: 'Assistente de IA não configurado. Peça ao administrador para definir ANTHROPIC_API_KEY.' }
  }

  try {
    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: historico.map((m) => ({ role: m.role, content: m.content })),
    })

    const texto = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')

    return { resposta: texto }
  } catch (err) {
    console.error('Erro no assistente IA:', err)
    return { error: 'Não foi possível falar com o assistente agora. Tente novamente em instantes.' }
  }
}
