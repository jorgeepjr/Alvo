'use server'

import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export async function gerarAnaliseSemanal(): Promise<{ analise?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { error: 'Assistente de IA não configurado. Defina ANTHROPIC_API_KEY.' }
  }

  const hoje = new Date()
  const hojeStr = hoje.toISOString().slice(0, 10)
  const inicio = new Date(hoje)
  inicio.setDate(hoje.getDate() - 13)
  const inicioStr = inicio.toISOString().slice(0, 10)

  const { data: vendedores } = await supabase
    .from('profiles')
    .select('id, nome')
    .eq('perfil', 'vendedor')
    .eq('ativo', true)

  const { data: lancamentos } = await supabase
    .from('lancamentos')
    .select('vendedor_id, data, valor, atendimentos, pecas')
    .gte('data', inicioStr)
    .lte('data', hojeStr)

  const { data: cotas } = await supabase
    .from('distribuicao_diaria')
    .select('vendedor_id, data, cota_valor')
    .gte('data', inicioStr)
    .lte('data', hojeStr)

  const { data: rotinas } = await supabase
    .from('rotina_concluida')
    .select('vendedor_id, data')
    .gte('data', inicioStr)
    .lte('data', hojeStr)

  const meio = new Date(hoje)
  meio.setDate(hoje.getDate() - 6)
  const meioStr = meio.toISOString().slice(0, 10)

  const resumo = (vendedores ?? []).map((v) => {
    const lancV = (lancamentos ?? []).filter((l) => l.vendedor_id === v.id)
    const semanaAtual = lancV.filter((l) => l.data >= meioStr)
    const semanaAnterior = lancV.filter((l) => l.data < meioStr)
    const soma = (arr: typeof lancV, campo: 'valor' | 'atendimentos' | 'pecas') =>
      arr.reduce((acc, l) => acc + Number(l[campo]), 0)
    const cotaSemana = (cotas ?? [])
      .filter((c) => c.vendedor_id === v.id && c.data >= meioStr)
      .reduce((acc, c) => acc + Number(c.cota_valor), 0)
    const rotinasFeitas = (rotinas ?? []).filter((r) => r.vendedor_id === v.id && r.data >= meioStr).length

    return {
      nome: v.nome,
      semana_atual: {
        valor: soma(semanaAtual, 'valor'),
        atendimentos: soma(semanaAtual, 'atendimentos'),
        pecas: soma(semanaAtual, 'pecas'),
        cota_valor: cotaSemana,
        itens_rotina_concluidos: rotinasFeitas,
      },
      semana_anterior: {
        valor: soma(semanaAnterior, 'valor'),
        atendimentos: soma(semanaAnterior, 'atendimentos'),
        pecas: soma(semanaAnterior, 'pecas'),
      },
    }
  })

  try {
    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1200,
      system: `Você é o analista de vendas de uma loja de roupas femininas. Receberá dados dos últimos 14 dias (semana atual vs semana anterior) por vendedor.
Gere um relatório curto em português do Brasil para a gestora, com:
1. Resumo geral da semana (crescimento ou queda vs semana anterior).
2. Destaque individual de cada vendedor: vendas vs cota, ticket médio (valor/atendimentos), peças por atendimento, e empenho na rotina.
3. Um alerta se algum indicador caiu de forma relevante.
4. Uma sugestão prática de foco para a próxima semana.
Use listas curtas e números formatados em reais. Seja direto.`,
      messages: [{ role: 'user', content: `Dados:\n${JSON.stringify(resumo, null, 2)}` }],
    })

    const texto = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')

    return { analise: texto }
  } catch (err) {
    console.error('Erro na análise semanal:', err)
    return { error: 'Não foi possível gerar a análise agora. Tente novamente em instantes.' }
  }
}
