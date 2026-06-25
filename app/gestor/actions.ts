'use server'

import { createClient } from '@/lib/supabase/server'
import { chamarGemini } from '@/lib/gemini'

// Projeção inteligente do mês com IA, considerando a sazonalidade (como foi o
// mesmo mês nos anos anteriores, dia a dia) e o ritmo atual das vendas.
export async function projetarMesIA(): Promise<{ analise?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { error: 'IA não configurada. Defina GEMINI_API_KEY.' }

  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth() + 1
  const mm = String(mes).padStart(2, '0')
  const ultimoDia = new Date(ano, mes, 0).getDate()
  const diaHoje = hoje.getDate()

  // Vendas do mês atual até hoje
  const { data: lancMes } = await supabase
    .from('lancamentos')
    .select('data, valor')
    .gte('data', `${ano}-${mm}-01`)
    .lte('data', `${ano}-${mm}-${String(ultimoDia).padStart(2, '0')}`)
  const vendidoAteHoje = (lancMes ?? []).reduce((a, l) => a + Number(l.valor), 0)

  // Mesmo mês nos anos anteriores (histórico diário) → total por ano
  const { data: histDiario } = await supabase.from('historico_diario').select('data, venda_total')
  const totalPorAno: Record<string, number> = {}
  for (const d of histDiario ?? []) {
    if (d.data.slice(5, 7) !== mm) continue // só o mesmo mês
    const a = d.data.slice(0, 4)
    totalPorAno[a] = (totalPorAno[a] ?? 0) + Number(d.venda_total)
  }

  // Meta do mês
  const { data: meta } = await supabase.from('metas_mensais').select('meta_valor').eq('ano', ano).eq('mes', mes).maybeSingle()

  const contexto = {
    mes,
    ano,
    dia_de_hoje: diaHoje,
    dias_no_mes: ultimoDia,
    vendido_ate_hoje: Math.round(vendidoAteHoje),
    meta_do_mes: Math.round(Number(meta?.meta_valor ?? 0)),
    mesmo_mes_anos_anteriores: totalPorAno,
  }

  try {
    const texto = await chamarGemini(
      apiKey,
      `Você é analista de vendas da ZYNK (moda masculina). Projete o faturamento do mês com base nos dados.
Considere a sazonalidade: veja como foi o mesmo mês nos anos anteriores (se costuma crescer no fim do mês, em datas comemorativas, etc.).
Responda em português do Brasil, curto e direto:
1. Projeção de faturamento para o fim do mês (um valor em reais) e a probabilidade de bater a meta.
2. Em que parte do mês historicamente as vendas aceleram (início/meio/fim).
3. 2 ou 3 ações concretas para garantir/superar a meta.
Não invente números além dos fornecidos.`,
      [{ role: 'user', content: `Dados:\n${JSON.stringify(contexto, null, 2)}` }]
    )
    return { analise: texto }
  } catch (err) {
    console.error('Erro projeção IA:', err)
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'CHAVE_INVALIDA') return { error: 'A chave GEMINI_API_KEY não é válida. Verifique no servidor.' }
    if (msg === 'LIMITE_EXCEDIDO') return { error: 'Limite gratuito da IA atingido por agora. Tente em alguns minutos.' }
    if (msg === 'SOBRECARREGADO') return { error: 'A IA do Google está sobrecarregada agora. Aguarde 1 minuto e tente de novo.' }
    return { error: `Não foi possível gerar a projeção (${msg || 'erro desconhecido'}).` }
  }
}
