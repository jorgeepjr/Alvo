import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { editarVendedor } from '../actions'
import { carregarConfig, historicoVendedores } from '@/lib/dados-mes'
import { hojeBR, nomeMes, nomeMesCurto, ymDe } from '@/lib/datas'
import { calcularComissao } from '@/lib/comissao'
import { TopoPagina } from '@/components/topo-pagina'
import { Cartao, N1, P, R, R0, Tag } from '@/components/bloco-mes'
import { BarrasChart } from '@/components/barras-chart'

const inp = 'w-full rounded-lg border border-white/10 bg-[#0b1324] px-3 py-2.5'

// Histórico do vendedor mês a mês (pedido do Junior, 12/11).
export default async function VendedorDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: vendedor } = await supabase.from('profiles').select('*').eq('id', id).single()
  if (!vendedor) notFound()
  const ymHoje = ymDe(hojeBR())

  const [hist, cfg] = await Promise.all([historicoVendedores(supabase, ymHoje, 12), carregarConfig(supabase)])
  const H = hist[id] ?? []

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const admin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: authData } = await admin.auth.admin.getUserById(id)
  const email = authData?.user?.email ?? ''

  return (
    <div className="space-y-4">
      <TopoPagina area="Equipe" titulo={vendedor.nome} descricao="Vendas mês a mês, meta, ticket, PA e comissão." />

      <Cartao titulo="📊 Últimos 12 meses">
        <BarrasChart dados={H.map((m) => ({ label: nomeMesCurto(m.ym), valor: Math.round(m.vendido) }))} destaque={nomeMesCurto(ymHoje)} />
      </Cartao>

      <Cartao titulo="Mês a mês">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-slate-400">
                <th className="py-2">Mês</th><th className="text-right">Vendido</th><th className="text-right">Meta</th><th className="text-right">%</th><th className="text-right">Atend.</th><th className="text-right">Ticket</th><th className="text-right">PA</th><th className="text-right">Comissão</th>
              </tr>
            </thead>
            <tbody>
              {[...H].reverse().map((m) => {
                const c = calcularComissao(m.vendido, m.meta, { pctComMeta: cfg.comMeta, pctSemMeta: cfg.comSem })
                return (
                  <tr key={m.ym} className="border-b border-white/5">
                    <td className="py-2">{nomeMes(m.ym)} {m.ym === ymHoje && <Tag tom="neu">parcial</Tag>}</td>
                    <td className="text-right">{R0(m.vendido)}</td>
                    <td className="text-right">{m.meta ? R0(m.meta) : '—'}</td>
                    <td className={`text-right font-bold ${m.meta && m.vendido >= m.meta ? 'text-emerald-300' : ''}`}>{m.meta ? P(m.vendido / m.meta) : '—'}</td>
                    <td className="text-right">{m.atendimentos}</td>
                    <td className="text-right">{m.atendimentos ? R0(m.vendido / m.atendimentos) : '—'}</td>
                    <td className="text-right">{m.atendimentos ? N1(m.pecas / m.atendimentos) : '—'}</td>
                    <td className="text-right">{m.vendido ? <>{R(c.comissao)} <span className="text-xs text-slate-400">{c.percentual}%</span></> : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-400">Até mai/2026 os lançamentos por vendedor estão incompletos (o histórico da loja veio das planilhas).</p>
      </Cartao>

      <details className="rounded-2xl border border-white/10 bg-[#111a2d] p-4">
        <summary className="cursor-pointer text-sm font-semibold text-emerald-300">Editar nome, e-mail ou senha</summary>
        <form action={editarVendedor.bind(null, id)} autoComplete="off" className="mt-3 grid items-end gap-3 sm:grid-cols-4">
          <div><label className="mb-1 block text-xs text-slate-400">Nome</label><input name="nome" defaultValue={vendedor.nome} required className={inp} /></div>
          <div><label className="mb-1 block text-xs text-slate-400">E-mail</label><input name="email" type="email" defaultValue={email} autoComplete="off" className={inp} /></div>
          <div><label className="mb-1 block text-xs text-slate-400">Nova senha (opcional)</label><input name="senha" type="password" placeholder="deixe em branco pra manter" autoComplete="new-password" className={inp} /></div>
          <button className="rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-bold text-[#04111a]">Salvar</button>
        </form>
      </details>
    </div>
  )
}
