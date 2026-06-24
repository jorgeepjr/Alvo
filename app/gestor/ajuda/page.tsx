import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Item = { titulo: string; itens: string[] }

const SECOES: Item[] = [
  {
    titulo: '📊 Dashboard',
    itens: [
      'Cartões do dia: vendido, atendimentos, peças e venda da loja.',
      'Alerta no topo: aparece em vermelho quando a projeção do mês cai abaixo de 90% da meta ou um vendedor está atrás do ritmo.',
      'Gráfico "Mês Atual": linha branca = vendido real; azul = projeção no ritmo atual; verde = ritmo da meta; laranja = mesmo mês do ano passado (dia a dia real).',
      'Gráfico "Vendas por Dia": barras de cada dia (verde = bateu a cota do dia, vermelho = abaixo).',
      'Resumo do Dia: texto pronto — clique em "Copiar para o WhatsApp" e cole no grupo da equipe.',
      'Projeção do Mês com IA: usa o histórico para projetar o fechamento considerando sazonalidade (precisa da chave de IA).',
      'Ranking de vendedores por % da meta.',
    ],
  },
  {
    titulo: '🎯 Metas',
    itens: [
      'Cotas Futuras (automático): um clique gera as metas dos próximos 12 meses com base no histórico. Não altera o que você já definiu.',
      'Passo 1 — defina a meta do mês (valor, atendimentos, peças). Tudo em número redondo.',
      'Passo 2 — "Gerar Distribuição Automática" divide a meta pelos dias (domingo entra fechado). A linha "Total distribuído" mostra ✓ verde quando bate com a meta.',
      'Edite a cota de um dia: o sistema reequilibra os outros dias sozinho para continuar batendo a meta.',
      'Marque Feriado/Fechado num dia: o valor é redistribuído automaticamente entre os outros dias.',
      'Passo 3 — defina o % de cada vendedor; a distribuição por vendedor é recalculada sozinha.',
    ],
  },
  {
    titulo: '🧾 Lançamento',
    itens: [
      'Lance ou edite as vendas do dia (por vendedor ou venda da loja).',
      'O valor aceita vírgula (ex: 150,00).',
      'Totais no rodapé: "Total dos Vendedores" (base da cota) e "Total Geral" (vendedores + loja).',
      'Motivo / Observação do Dia: anote o que explica um dia fraco ou forte (chuva, evento, feriado próximo).',
      '"Fechar Dia" bloqueia novos lançamentos naquela data.',
    ],
  },
  {
    titulo: '✅ Rotina Diária',
    itens: [
      'Crie tarefas avulsas para um dia.',
      'Divisão da Rotina: "Dividir automaticamente" dá um dono para cada bloco (equilibrando a carga) e mantém vitrine/looks e estratégia digital como "Ambos".',
      'Os papéis trocam toda semana (rotação semanal) — ninguém fica preso na mesma função.',
      'Você pode ajustar manualmente cada bloco (Ambos / Grupo A / Grupo B).',
    ],
  },
  {
    titulo: '📈 Histórico',
    itens: [
      'Faturamento por ano, por mês e por dia (gráficos de barras).',
      '"Vendas por Dia" compara o mês atual com o mesmo mês do ano passado, dia a dia.',
      'Comparativos mês a mês de valor, atendimentos e peças (crescimento/queda ▲▼).',
      'Histórico diário importado das suas planilhas (2023, 2024, 2025).',
    ],
  },
  {
    titulo: '🤝 Engajamento',
    itens: [
      'Veja quantos itens da rotina cada vendedor concluiu nos últimos 7 dias.',
      'Análise Semanal com IA: resumo da semana por vendedor.',
      'Insights das Perguntas: a IA resume o que os vendedores mais perguntam ao assistente, com oportunidades de melhoria.',
    ],
  },
  {
    titulo: '🤖 Assistente IA e 📚 Manuais',
    itens: [
      'Assistente IA: chat para vendedores e gestora pedirem ideias de campanha, vídeos e estratégias (conhece os números do mês).',
      'Manuais: materiais da ZYNK (Cartilha de Conduta, Instagram, Diagnóstico) para leitura no sistema.',
      'As funções de IA dependem da chave GEMINI_API_KEY configurada no servidor.',
    ],
  },
]

export default function AjudaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manual do Sistema</h1>
        <p className="text-sm text-zinc-400">Guia rápido de tudo que o sistema faz e onde encontrar.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {SECOES.map((s) => (
          <Card key={s.titulo} className="border-slate-800 bg-slate-900">
            <CardHeader><CardTitle className="text-base">{s.titulo}</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {s.itens.map((it, i) => (
                  <li key={i} className="text-sm text-zinc-300 leading-relaxed flex gap-2">
                    <span className="text-zinc-500 shrink-0">•</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
