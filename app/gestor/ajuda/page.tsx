import Link from 'next/link'
import { TopoPagina } from '@/components/topo-pagina'
import { Cartao } from '@/components/bloco-mes'

type Secao = { id: string; titulo: string; href: string; praQue: string; passos: string[]; dica?: string }

// Um "pra que serve" + passo a passo de cada tela (repaginada 12/11/2026).
const SECOES: Secao[] = [
  {
    id: 'inicio', titulo: '🏠 Início', href: '/gestor',
    praQue: 'O dia e o mês da loja numa tela só: quanto vendeu, a meta e se vai bater.',
    passos: [
      'Escolha o mês nas setas lá em cima. O mês escolhido vale pra todas as telas até você clicar em "hoje".',
      'Avisos no topo: dia sem lançamento (aparece no dia seguinte, porque o dia fecha às 18h), fechamento do mês anterior (do dia 1 ao 10) e as 2 avaliações do mês (dia 15 e do dia 20 ao 25).',
      'A marca branca na barra é onde a loja deveria estar até o último dia lançado.',
      '"Vai bater?": 3 projeções. A do meio (pela cota) é a mais confiável, porque já sabe que sexta e sábado vendem mais. A da curva usa o mesmo mês do ano passado (pega a Black e o Natal).',
      '"Precisa R$ X por dia": quanto falta dividido pelos dias úteis que sobram.',
      'Clique num vendedor pra ver o histórico dele. Copie o resumo e cole no grupo da loja.',
    ],
  },
  {
    id: 'lancar', titulo: '✍️ Lançar vendas', href: '/gestor/lancamento',
    praQue: 'Lançar ou corrigir o dia de cada vendedor pelo fechamento de caixa. O que você salva é o número oficial.',
    passos: [
      '1. Escolha o dia (os últimos 4 dias úteis ficam à mão; pra outro dia, use o calendário).',
      '2. Escolha quem vendeu ("Loja" = venda sua ou sem vendedor).',
      '3. Atendimentos, peças e valor. O campo do WhatsApp é opcional.',
      'Fica marcado "corrigido por você em dd/mm hh:mm". Depois disso as vendas que o vendedor registrar nesse dia não mudam mais o número.',
      'O quadro "Quem lançou" mostra o mês inteiro: clique em qualquer quadradinho pra lançar ou corrigir. Vermelho = dia útil sem lançamento.',
    ],
    dica: 'Os vendedores registram venda por venda durante o dia (só hoje). Isso vira uma prévia do dia que você confere pelo caixa.',
  },
  {
    id: 'metas', titulo: '🎯 Metas', href: '/gestor/metas',
    praQue: 'A meta do mês, a cota de cada dia e a parte de cada vendedor.',
    passos: [
      '1. Meta do mês: digite ou clique em "Usar →" na sugestão (mesmo mês do ano passado +20%).',
      '2. Cota de cada dia: cada dia recebe a venda do mesmo dia da semana do ano passado (364 dias antes, o que alinha a Black), proporcional à meta. O dia do ano passado que sobra vai pro último dia.',
      'Clique num dia do calendário pra mudar a cota ou marcar feriado/fechado. O dia salvo fica 📌; os dias de antes e os que já passaram não mudam, e a diferença vai só pros dias seguintes.',
      '3. Parte de cada vendedor: os percentuais têm que somar 100%.',
    ],
  },
  {
    id: 'comissao', titulo: '💰 Comissão', href: '/gestor/comissoes',
    praQue: 'O fechamento pra pagar os vendedores.',
    passos: ['Escolha o mês lá em cima (normalmente o anterior). Do dia 1 ao 10 o Início já avisa e traz você pra cá.', 'Veja quanto cada um vendeu, se bateu a meta e quanto recebe.', 'Exporte a planilha do fechamento.'],
  },
  {
    id: 'vendedores', titulo: '👥 Vendedores', href: '/gestor/vendedores',
    praQue: 'Como cada vendedor está no mês e nos últimos meses.',
    passos: ['Vendido, meta, atendimentos, peças, ticket e PA de cada um no mês escolhido.', 'Clique no nome pro histórico de 12 meses com a comissão de cada mês.', 'Cadastrar, ativar ou inativar fica no fim da tela.'],
  },
  {
    id: 'rotina', titulo: '✅ Rotina (hábitos)', href: '/gestor/rotina',
    praQue: 'No máximo 5 hábitos por dia, iguais pra todo mundo.',
    passos: ['Você escolhe os hábitos (dá pra mudar o texto, tirar ou pôr, até 5).', 'O vendedor marca no "Meu dia".', 'Aqui aparece quem cumpriu na semana: verde fez todos, amarelo parte, vermelho nenhum.'],
  },
  {
    id: 'historico', titulo: '📈 Histórico', href: '/gestor/historico',
    praQue: 'As vendas da loja desde 2023.',
    passos: ['Ano contra ano, comparando só os mesmos meses (justo com o ano que não acabou).', 'A leitura diz se o crescimento vem de mais clientes ou de mais peças por cliente.', 'Mês a mês com vendas, atendimentos, peças, ticket e PA. Clique num mês pra abrir no Início.'],
  },
  {
    id: 'ajustes', titulo: '⚙️ Ajustes', href: '/gestor/ajustes',
    praQue: 'Configurações e o que ficou guardado.',
    passos: ['Os dias das avaliações do mês.', 'Importar planilha.', '"Guardado pra depois": campanhas, desafios, assistente, tarefas, engajamento. Saíram do menu, nada foi apagado.'],
  },
]

export default function AjudaPage() {
  return (
    <div className="space-y-4">
      <TopoPagina area="Ajustes" titulo="Ajuda" descricao="Pra que serve cada tela e como usar." />
      <div className="grid gap-4 lg:grid-cols-2">
        {SECOES.map((s) => (
          <Cartao key={s.id} id={s.id} className="scroll-mt-6" titulo={s.titulo} extra={<Link href={s.href} className="text-sm font-bold text-cyan-300 hover:underline">abrir →</Link>}>
            <p className="mb-2 text-sm text-slate-200"><b>Pra que serve:</b> {s.praQue}</p>
            <ul className="space-y-1.5">
              {s.passos.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-300"><span className="shrink-0 text-slate-500">•</span><span>{p}</span></li>
              ))}
            </ul>
            {s.dica && <p className="mt-2 rounded-lg bg-cyan-400/10 px-3 py-2 text-xs text-slate-300">💡 {s.dica}</p>}
          </Cartao>
        ))}
      </div>
    </div>
  )
}
