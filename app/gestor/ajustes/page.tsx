import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { carregarConfig } from '@/lib/dados-mes'
import { salvarAvaliacoes } from './actions'
import { TopoPagina } from '@/components/topo-pagina'
import { Cartao } from '@/components/bloco-mes'

// Saiu do menu na repaginada (12/11/2026) pra deixar o sistema simples.
// Nada foi apagado: cada tela continua funcionando pelo link.
const GUARDADO = [
  { icone: '📣', nome: 'Campanhas', uso: '26 ideias cadastradas, nenhuma planejada ou feita', href: '/gestor/campanhas' },
  { icone: '🏅', nome: 'Gamificação completa e desafios', uso: 'nenhum desafio criado', href: '/gestor/gamificacao' },
  { icone: '🤖', nome: 'Assistente IA', uso: '13 perguntas, a última em julho', href: '/painel/assistente' },
  { icone: '📝', nome: 'Tarefas avulsas e rotina antiga', uso: 'nunca usadas / 22 itens marcados no total', href: '/gestor/tarefas' },
  { icone: '📊', nome: 'Engajamento', uso: 'dependia da rotina antiga e do assistente', href: '/gestor/engajamento' },
  { icone: '🧮', nome: 'Indicadores (tela antiga)', uso: 'ticket, PA e preço médio agora estão no Início', href: '/gestor/indicadores' },
]

const inp = 'w-full rounded-lg border border-white/10 bg-[#0b1324] px-3 py-2.5'

export default async function AjustesPage() {
  const supabase = await createClient()
  const cfg = await carregarConfig(supabase)
  return (
    <div className="space-y-4">
      <TopoPagina area="Ajustes" titulo="Ajustes" descricao={<>Configurações e o que ficou <b className="text-slate-200">guardado pra depois</b>.</>} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Cartao titulo="🧭 Avaliações do mês">
            <p className="mb-3 text-xs text-slate-400">O Início avisa se a meta vai dar certo em dois momentos, a tempo de reagir: no meio do mês (pra saber se precisa esquentar a 2ª quinzena) e na reta final (pra forçar, com a live do dia 25).</p>
            <form action={salvarAvaliacoes} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <div><label className="mb-1 block text-xs text-slate-400">Meio do mês: a partir do dia</label><input name="aval_meio" type="number" min={1} max={31} defaultValue={cfg.avalMeio} className={inp} /></div>
              <div><label className="mb-1 block text-xs text-slate-400">Reta final: do dia</label><input name="aval_final_ini" type="number" min={1} max={31} defaultValue={cfg.avalFinalIni} className={inp} /></div>
              <div><label className="mb-1 block text-xs text-slate-400">até o dia</label><input name="aval_final_fim" type="number" min={1} max={31} defaultValue={cfg.avalFinalFim} className={inp} /></div>
              <button className="rounded-lg bg-slate-300 px-4 py-2.5 text-sm font-bold text-[#04111a]">Salvar</button>
            </form>
          </Cartao>

          <Cartao titulo="💰 Comissão">
            <p className="text-sm text-slate-300">Hoje: <b>{cfg.comMeta}%</b> se bateu a meta · <b>{cfg.comSem}%</b> se não bateu.</p>
            <Link href="/gestor/comissoes" className="mt-2 inline-block text-sm font-bold text-cyan-300 hover:underline">Mudar a regra na Comissão →</Link>
          </Cartao>

          <Cartao titulo="⬆️ Importar planilha">
            <p className="text-xs text-slate-400">Pra trazer histórico antigo (Excel ou CSV). Já foi usado pra trazer 2023 a 2026.</p>
            <Link href="/gestor/importar" className="mt-2 inline-block text-sm font-bold text-cyan-300 hover:underline">Abrir a importação →</Link>
          </Cartao>
        </div>

        <Cartao titulo="📦 Guardado pra depois" extra={<span className="cursor-help rounded-full border border-white/15 px-1.5 text-[11px] text-slate-400" title="Saiu do menu pra deixar o sistema simples. Nenhum dado foi apagado: a tela continua funcionando pelo link.">?</span>}>
          {GUARDADO.map((g) => (
            <div key={g.href} className="flex items-center gap-3 border-b border-white/5 py-2.5 last:border-0">
              <div className="flex-1">
                <b>{g.icone} {g.nome}</b>
                <div className="text-xs text-slate-400">{g.uso}</div>
              </div>
              <Link href={g.href} className="whitespace-nowrap text-sm font-bold text-cyan-300 hover:underline">abrir →</Link>
            </div>
          ))}
        </Cartao>
      </div>
    </div>
  )
}
