import { createClient } from '@/lib/supabase/server'
import { apagarVenda } from './actions'
import { datasDoMes, ddmm, diaSemana, hojeBR, MESES_NOME, mesDe, ymDe } from '@/lib/datas'
import { TopoPagina } from '@/components/topo-pagina'
import { Cartao, N1, R, R0 } from '@/components/bloco-mes'
import { NovaVenda } from './nova-venda'

// Vendedor: registra venda por venda, só no dia de hoje. Dia que passou fica
// travado: só o gestor lança ou corrige.
export default async function LancarVendasVendedor() {
  const hoje = hojeBR()
  const ym = ymDe(hoje)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const id = user!.id

  const [{ data: vendas }, { data: lancMes }, { data: cotaHoje }, { data: dist }] = await Promise.all([
    supabase.from('vendas').select('*').eq('vendedor_id', id).eq('data', hoje).order('hora'),
    supabase.from('lancamentos').select('data, corrigido_por').eq('vendedor_id', id).gte('data', `${ym}-01`).lte('data', hoje),
    supabase.from('distribuicao_diaria').select('cota_valor').eq('vendedor_id', id).eq('data', hoje).maybeSingle(),
    supabase.from('distribuicao_diaria').select('data, situacao').is('vendedor_id', null).gte('data', `${ym}-01`).lte('data', hoje),
  ])
  const X = vendas ?? []
  const val = X.reduce((a, s) => a + Number(s.valor), 0)
  const pc = X.reduce((a, s) => a + s.pecas, 0)
  const n = X.length
  const cota = Number(cotaHoje?.cota_valor ?? 0)
  const lanc = new Set((lancMes ?? []).map((l) => l.data))
  const corrigidoHoje = (lancMes ?? []).some((l) => l.data === hoje && l.corrigido_por)
  const sit = new Map((dist ?? []).map((d) => [d.data, d.situacao]))
  const dias = datasDoMes(ym).filter((d) => d <= hoje)

  return (
    <div className="space-y-4">
      <TopoPagina area="Hoje" titulo="Lançar vendas" ajuda="/painel/manuais" descricao={<>Registre <b className="text-slate-200">cada venda</b> na hora. No fim do dia o sistema soma tudo.</>} />

      <div className="grid items-start gap-4 lg:grid-cols-[1.25fr_1fr]">
        <Cartao id="vForm" titulo={`✍️ Nova venda · hoje, ${ddmm(hoje)}`}>
          <NovaVenda />
        </Cartao>

        <Cartao id="vLista" titulo={<>🧾 Suas vendas de hoje <span className="rounded-full bg-white/5 px-2 text-xs text-slate-400">{n}</span></>}>
          {n ? (
            <table className="w-full text-sm">
              <tbody>
                {X.map((s) => (
                  <tr key={s.id} className="border-b border-white/5">
                    <td className="py-2 text-slate-400">{s.hora}</td>
                    <td>{s.pecas} peça{s.pecas > 1 ? 's' : ''}{s.whatsapp ? ' · 💬' : ''}</td>
                    <td className="text-right font-bold">{R(Number(s.valor))}</td>
                    <td className="w-10 text-right">
                      <form action={apagarVenda.bind(null, s.id)}>
                        <button className="rounded-md border border-white/10 px-2 py-0.5 text-xs hover:border-red-400" title="Apagar esta venda (só dá pra apagar as de hoje)">✕</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-slate-400">Nenhuma venda ainda hoje.</p>
          )}
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div><b className="block text-xl">{R(val)}</b><span className="text-xs text-slate-400">vendido hoje</span></div>
            <div><b className="block text-xl">{n}</b><span className="text-xs text-slate-400">atendimentos · {pc} peças</span></div>
            <div><b className="block text-xl">{n ? R(val / n) : '—'}</b><span className="text-xs text-slate-400">ticket · PA {n ? N1(pc / n) : '—'}</span></div>
          </div>
          {cota > 0 && (
            <>
              <div className="mt-3 h-2.5 rounded-full bg-[#0b1324]"><i className="block h-full rounded-full bg-cyan-400" style={{ width: `${Math.min(100, (val / cota) * 100)}%` }} /></div>
              <p className="mt-1 text-xs text-slate-400">Cota de hoje: {R0(cota)} · {val >= cota ? <b className="text-emerald-300">bateu! 🎉</b> : <>faltam <b className="text-slate-100">{R(cota - val)}</b></>}</p>
            </>
          )}
          {corrigidoHoje && <p className="mt-2 text-xs text-amber-300">✏️ O gestor já conferiu o dia de hoje pelo caixa: o número dele é o que vale.</p>}
        </Cartao>
      </div>

      <Cartao id="vDias" titulo={`🗓️ Seus dias em ${MESES_NOME[mesDe(ym) - 1]}`}>
        <div className="overflow-x-auto">
          <div className="grid gap-[3px] text-[11px]" style={{ gridTemplateColumns: `52px repeat(${dias.length}, minmax(18px, 1fr))` }}>
            <span />
            {dias.map((d) => <span key={d} className="text-center text-slate-500">{Number(d.slice(8))}</span>)}
            <b className="text-xs">Você</b>
            {dias.map((d) => {
              const normal = (sit.get(d) ?? (diaSemana(d) === 0 ? 'fechado' : 'normal')) === 'normal'
              const ok = lanc.has(d) || (d === hoje && n > 0)
              const cls = !normal ? 'bg-[#0f1729] text-slate-600' : ok ? 'bg-emerald-400/15 text-emerald-300' : d === hoje ? 'text-slate-500' : 'bg-red-400/15 text-red-300'
              return <span key={d} className={`grid h-[22px] place-items-center rounded font-bold ${cls} ${d === hoje ? 'outline outline-2 outline-offset-1 outline-cyan-400' : ''}`}>{!normal ? '·' : ok ? '✓' : d === hoje ? '·' : '!'}</span>
            })}
          </div>
        </div>
        <p className="mt-2.5 text-xs text-slate-400">🔒 Dia que passou só o gestor lança ou corrige. Errou ou esqueceu? Avise o Junior.</p>
      </Cartao>
    </div>
  )
}
