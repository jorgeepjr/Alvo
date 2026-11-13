import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { criarVendedor, alternarAtivo } from './actions'
import { carregarMes, historicoVendedores } from '@/lib/dados-mes'
import { mesSelecionado } from '@/lib/mes-selecionado'
import { hojeBR, nomeMes, ymDe } from '@/lib/datas'
import { statusMes } from '@/lib/projecao'
import { TopoPagina } from '@/components/topo-pagina'
import { Cartao, N1, P, R0, Seta, Tag } from '@/components/bloco-mes'

const CORES = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24']
const inp = 'w-full rounded-lg border border-white/10 bg-[#0b1324] px-3 py-2.5'

export default async function VendedoresPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sp = await searchParams
  const ym = await mesSelecionado(sp)
  const hoje = hojeBR()
  const supabase = await createClient()
  const [D, hist, { data: todos }] = await Promise.all([
    carregarMes(supabase, ym, hoje),
    historicoVendedores(supabase, ymDe(hoje) > ym ? ymDe(hoje) : ym, 6),
    supabase.from('profiles').select('*').eq('perfil', 'vendedor').order('nome'),
  ])
  const meses = Object.values(hist)[0]?.map((m) => m.ym).reverse() ?? []

  return (
    <div className="space-y-4">
      <TopoPagina area="Equipe" titulo="Vendedores" ym={ym} ajuda="/gestor/ajuda#vendedores" descricao={<>Cada vendedor no mês escolhido. <b className="text-slate-200">Clique no nome</b> pra ver o histórico dele.</>} />

      <Cartao titulo={`👥 Vendedores · ${nomeMes(ym)}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-slate-400">
                <th className="py-2">Vendedor</th><th className="text-right">Vendido</th><th className="text-right">Meta</th><th className="text-right">%</th><th className="text-right">Atend.</th><th className="text-right">Peças</th><th className="text-right">Ticket</th><th className="text-right">PA</th><th className="text-right">Ritmo</th><th className="pl-3">Situação</th>
              </tr>
            </thead>
            <tbody>
              {D.vendedores.map((v, k) => {
                const x = D.porVendedor[v.id]
                const st = statusMes(x)
                return (
                  <tr key={v.id} className="border-b border-white/5 hover:bg-white/[.02]">
                    <td className="py-2.5"><Link href={`/gestor/vendedores/${v.id}`} className="font-bold hover:underline"><span style={{ color: CORES[k % 4] }}>●</span> {v.nome}</Link></td>
                    <td className="text-right">{R0(x.vendido)}</td>
                    <td className="text-right">{R0(x.meta)}</td>
                    <td className="text-right font-bold">{P(x.pct)}</td>
                    <td className="text-right">{x.atendimentos}</td>
                    <td className="text-right">{x.pecas}</td>
                    <td className="text-right">{R0(x.ticket)}</td>
                    <td className="text-right">{N1(x.pa)}</td>
                    <td className="text-right">{x.fechado ? <Seta v={x.vendido - x.meta} /> : x.diasLancados ? <Seta v={x.vendido - x.cotaAte} /> : '—'}</td>
                    <td className="pl-3"><Tag tom={st.tom}>{x.fechado ? (x.vendido >= x.meta ? 'bateu' : 'não bateu') : x.meta && x.diasLancados ? `provável ${P(x.provavel / x.meta)}` : st.texto}</Tag></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Cartao>

      <Cartao titulo="📊 Últimos meses">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-slate-400"><th className="py-2">Mês</th>{D.vendedores.map((v) => <th key={v.id} className="text-right">{v.nome}</th>)}</tr>
            </thead>
            <tbody>
              {meses.map((m) => (
                <tr key={m} className="border-b border-white/5 hover:bg-white/[.02]">
                  <td className="py-2"><Link href={`/gestor/vendedores?mes=${m}`} className="hover:underline">{nomeMes(m)}</Link>{m === ymDe(hoje) && <span className="ml-1.5 rounded-full bg-white/5 px-2 text-xs text-slate-400">parcial</span>}</td>
                  {D.vendedores.map((v) => {
                    const x = hist[v.id]?.find((h) => h.ym === m)
                    const pct = x && x.meta ? x.vendido / x.meta : 0
                    return <td key={v.id} className="text-right">{R0(x?.vendido ?? 0)} <span className={`text-xs ${pct >= 1 ? 'text-emerald-300' : 'text-slate-400'}`}>{x?.meta ? P(pct) : ''}</span></td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-400">Clique num mês pra abrir ele na tela toda. Até mai/2026 os lançamentos por vendedor estão incompletos.</p>
      </Cartao>

      <details className="rounded-2xl border border-white/10 bg-[#111a2d] p-4">
        <summary className="cursor-pointer text-sm font-semibold text-emerald-300">Cadastrar, ativar ou inativar vendedor</summary>
        <form action={criarVendedor} autoComplete="off" className="mt-3 grid items-end gap-3 sm:grid-cols-4">
          <div><label className="mb-1 block text-xs text-slate-400">Nome</label><input name="nome" required autoComplete="off" className={inp} /></div>
          <div><label className="mb-1 block text-xs text-slate-400">E-mail de acesso</label><input name="email" type="email" required autoComplete="off" className={inp} /></div>
          <div><label className="mb-1 block text-xs text-slate-400">Senha inicial</label><input name="senha" type="password" required autoComplete="new-password" className={inp} /></div>
          <button className="rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-bold text-[#04111a]">+ Cadastrar</button>
        </form>
        <div className="mt-4 space-y-1.5">
          {(todos ?? []).map((v) => (
            <div key={v.id} className="flex items-center gap-3 text-sm">
              <Link href={`/gestor/vendedores/${v.id}`} className="font-semibold hover:underline">{v.nome}</Link>
              <Tag tom={v.ativo ? 'ok' : 'neu'}>{v.ativo ? 'ativo' : 'inativo'}</Tag>
              <form action={alternarAtivo.bind(null, v.id, !v.ativo)} className="ml-auto">
                <button className="rounded-lg border border-white/10 px-3 py-1 text-xs">{v.ativo ? 'Inativar' : 'Ativar'}</button>
              </form>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
