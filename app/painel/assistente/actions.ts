'use server'

import { createClient } from '@/lib/supabase/server'
import { chamarGemini } from '@/lib/gemini'

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

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { error: 'Assistente de IA não configurado. Peça ao administrador para definir GEMINI_API_KEY.' }
  }

  // Contexto real do vendedor: números do mês para dicas personalizadas
  const hoje = new Date()
  const hojeStr = hoje.toISOString().slice(0, 10)
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth() + 1
  const inicioMes = `${ano}-${String(mes).padStart(2, '0')}-01`

  const { data: profile } = await supabase.from('profiles').select('nome, perfil').eq('id', user.id).single()

  const { data: lancMes } = await supabase
    .from('lancamentos')
    .select('data, valor, atendimentos, pecas')
    .eq('vendedor_id', user.id)
    .gte('data', inicioMes)
    .lte('data', hojeStr)

  const { data: cotasMes } = await supabase
    .from('distribuicao_diaria')
    .select('data, cota_valor')
    .eq('vendedor_id', user.id)
    .gte('data', inicioMes)

  const valorMes = lancMes?.reduce((acc, l) => acc + Number(l.valor), 0) ?? 0
  const atendMes = lancMes?.reduce((acc, l) => acc + l.atendimentos, 0) ?? 0
  const pecasMes = lancMes?.reduce((acc, l) => acc + l.pecas, 0) ?? 0
  const cotaMesTotal = cotasMes?.reduce((acc, c) => acc + Number(c.cota_valor), 0) ?? 0
  const cotaAteHoje = cotasMes?.filter((c) => c.data <= hojeStr).reduce((acc, c) => acc + Number(c.cota_valor), 0) ?? 0
  const ticketCliente = atendMes > 0 ? valorMes / atendMes : 0
  const pecasPorAtendimento = atendMes > 0 ? pecasMes / atendMes : 0

  const contextoDados = `
DADOS REAIS DO USUÁRIO NESTE MÊS (${mes}/${ano}, até hoje, dia ${hoje.getDate()}):
- Nome: ${profile?.nome ?? '—'} (perfil: ${profile?.perfil ?? 'vendedor'})
- Vendido no mês: R$ ${valorMes.toFixed(2)}
- Meta do mês: R$ ${cotaMesTotal.toFixed(2)} | Meta acumulada até hoje: R$ ${cotaAteHoje.toFixed(2)}
- Situação: ${cotaAteHoje > 0 ? (valorMes >= cotaAteHoje ? 'ACIMA do ritmo da meta' : `ABAIXO do ritmo da meta (falta R$ ${(cotaAteHoje - valorMes).toFixed(2)} para o acumulado de hoje)`) : 'sem meta definida'}
- Atendimentos: ${atendMes} | Peças vendidas: ${pecasMes}
- Ticket médio por cliente: R$ ${ticketCliente.toFixed(2)} | Peças por atendimento: ${pecasPorAtendimento.toFixed(2)}

Use esses números para personalizar suas dicas e estratégias. Se o usuário estiver abaixo do ritmo, priorize ações de recuperação concretas (quanto precisa vender por dia, como aumentar ticket/peças por atendimento). Cite os números reais quando relevante.`

  try {
    const texto = await chamarGemini(apiKey, SYSTEM_PROMPT + '\n' + contextoDados, historico)

    const ultimaPergunta = historico[historico.length - 1]?.content ?? ''
    await supabase.from('assistente_mensagens').insert({
      vendedor_id: user.id,
      pergunta: ultimaPergunta,
      resposta: texto,
    })

    return { resposta: texto }
  } catch (err) {
    console.error('Erro no assistente IA:', err)
    return { error: 'Não foi possível falar com o assistente agora. Tente novamente em instantes.' }
  }
}
