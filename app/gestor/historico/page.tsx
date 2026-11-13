import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { hojeBR, MESES_CURTO, MESES_NOME, mesDe, anoDe, ymDe } from '@/lib/datas'
import { TopoPagina } from '@/components/topo-pagina'
import { Aviso, Cartao, N1, R0 } from '@/components/bloco-mes'
import { BarrasChart } from '@/components/barras-chart'

type Met = 'val' | 'at' | 'pc' | 'tk' | 'pa'
const METRICAS: Record<Met, string> = { val: 'Vendas', at: 'Atendimentos', pc: 'Peças', tk: 'Ticket médio', pa: 'PA' }

function Cresc({ a, b }: { a: number; b: number }) {
  if (!b) return null
  const v = a / b - 1
  return <span className={`font-bold ${v >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{v >= 0 ? '▲ +' : '▼ '}{Math.round(v * 100)}%</span>
}

export default async function HistoricoPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const sp = await searchParams
  const met: Met = (Object.keys(METRICAS) as Met[]).includes(sp.m as Met) ? (sp.m as Met) : 'val'
  const hoje = hojeBR()
  const ymHoje = ymDe(hoje)
  const anoHoje = anoDe(ymHoje)
  const supabase = await createClient()
  const { data } = await supabase.from('historico_loja').select('ano, mes, venda_total, atendimentos, pecas').order('ano').order('mes')

  const mapa = new Map((data ?? []).map((h) => [`${h.ano}-${String(h.mes).padStart(2, '0')}`, { v: Number(h.venda_total), at: Number(h.atendimentos ?? 0), pc: Number(h.pecas ?? 0) }]))
  const anos = [...new Set((data ?? []).map((h) => h.ano))].filter((a) => a <= anoHoje).sort().slice(-4)
  // Comparação justa: os mesmos meses em todos os anos (janeiro até o último mês fechado).
  const ultM = mesDe(ymHoje) - 1 || 12
  const k = (a: number, m: number) => `${a}-${String(m).padStart(2, '0')}`
  const Y = anos.map((a) => {
    const ms = Array.from({ length: ultM }, (_, i) => mapa.get(k(a, i + 1)))
    const v = ms.reduce((s, x) => s + (x?.v ?? 0), 0)
    const at = ms.reduce((s, x) => s + (x?.at ?? 0), 0)
    const pc = ms.reduce((s, x) => s + (x?.pc ?? 0), 0)
    return { a, v, at, pc, tk: at ? v / at : 0, pa: at ? pc / at : 0 }
  })
  const u = Y[Y.length - 1]
  const p = Y[Y.length - 2]
  let leitura = ''
  if (u && p && p.at && p.pc) {
    const dA = Math.round((u.at / p.at - 1) * 100)
    const dP = Math.round((u.pc / p.pc - 1) * 100)
    leitura =
      dA >= 0 && dP >= 0 ? `Mais clientes (${dA >= 0 ? '+' : ''}${dA}% atendimentos) e mais peças (+${dP}%). A loja está crescendo nas duas pontas.`
      : dA < 0 && dP >= 0 ? `Menos clientes (${dA}% atendimentos), mas cada um levando mais peças (+${dP}%). Cuidado: o crescimento vem do PA. Precisa trazer gente (reativação, tráfego).`
      : dA >= 0 ? `Mais clientes (+${dA}%), mas menos peças por cliente (${dP}%). Treinar venda adicional (PA).`
      : `Menos clientes (${dA}%) e menos peças (${dP}%). Atenção.`
  }

  const valor = (a: number, m: number): number | null => {
    const x = mapa.get(k(a, m))
    if (!x || !x.v) return null
    return met === 'val' ? x.v : met === 'at' ? x.at : met === 'pc' ? x.pc : met === 'tk' ? (x.at ? x.v / x.at : null) : x.at ? x.pc / x.at : null
  }
  const fmt = (v: number) => (met === 'val' || met === 'tk' ? R0(v) : met === 'pa' ? N1(v) : v.toLocaleString('pt-BR'))

  return (
    <div className="space-y-4">
      <TopoPagina area="Análise" titulo="Histórico" ajuda="/gestor/ajuda#historico" descricao={<>As vendas da loja por ano e por mês, <b className="text-slate-200">comparando com o ano anterior</b>.</>} />

      <Cartao titulo={`📈 Ano contra ano · jan a ${MESES_CURTO[ultM - 1]}`} extra={<span className="cursor-help rounded-full border border-white/15 px-1.5 text-[11px] text-slate-400" title="Compara só os mesmos meses em todos os anos (de janeiro até o último mês fechado), pra ser justo com o ano que ainda não acabou.">?</span>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-slate-400">
                <th className="py-2">Ano</th><th className="text-right">Vendas</th><th className="text-right">Cresc.</th><th className="text-right">Atendimentos</th><th className="text-right">Cresc.</th><th className="text-right">Peças</th><th className="text-right">Cresc.</th><th className="text-right">Ticket</th><th className="text-right">PA</th>
              </tr>
            </thead>
            <tbody>
              {Y.map((x, i) => (
                <tr key={x.a} className="border-b border-white/5">
                  <td className="py-2 font-bold">{x.a}</td>
                  <td className="text-right">{R0(x.v)}</td><td className="text-right">{i ? <Cresc a={x.v} b={Y[i - 1].v} /> : ''}</td>
                  <td className="text-right">{x.at.toLocaleString('pt-BR')}</td><td className="text-right">{i ? <Cresc a={x.at} b={Y[i - 1].at} /> : ''}</td>
                  <td className="text-right">{x.pc.toLocaleString('pt-BR')}</td><td className="text-right">{i ? <Cresc a={x.pc} b={Y[i - 1].pc} /> : ''}</td>
                  <td className="text-right">{R0(x.tk)}</td><td className="text-right">{N1(x.pa)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {leitura && <div className="mt-3"><Aviso tom="neu" icone="🔎" titulo={`Leitura de ${u.a} contra ${p.a}`}>{leitura}</Aviso></div>}
        <div className="mt-3"><BarrasChart dados={Y.map((x) => ({ label: String(x.a), valor: Math.round(x.v) }))} destaque={String(anoHoje)} /></div>
      </Cartao>

      <Cartao titulo={`📅 Mês a mês, ${anos[0]} a ${anos[anos.length - 1]}`}>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(Object.keys(METRICAS) as Met[]).map((m) => (
            <Link key={m} href={`/gestor/historico?m=${m}`} className={`rounded-full border px-3.5 py-1.5 text-sm ${m === met ? 'border-amber-400 bg-amber-400 font-extrabold text-[#04111a]' : 'border-white/10 bg-[#16213a]'}`}>{METRICAS[m]}</Link>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-slate-400"><th className="py-2">Mês</th>{anos.map((a) => <th key={a} className="text-right">{a}</th>)}<th className="text-right">{String(anoHoje).slice(2)} × {String(anoHoje - 1).slice(2)}</th></tr>
            </thead>
            <tbody>
              {MESES_NOME.map((nome, i) => {
                const vals = anos.map((a) => valor(a, i + 1))
                const ehParcial = (a: number) => k(a, i + 1) === ymHoje
                const ult = vals[vals.length - 1]
                const pen = vals[vals.length - 2]
                return (
                  <tr key={nome} className="border-b border-white/5 hover:bg-white/[.02]">
                    <td className="py-2"><Link href={`/gestor?mes=${k(anoHoje, i + 1)}`} className="hover:underline">{nome}</Link></td>
                    {vals.map((v, j) => (
                      <td key={j} className={`text-right ${j === vals.length - 1 ? 'font-bold' : 'text-slate-400'}`}>
                        {v != null ? fmt(v) : '—'}{ehParcial(anos[j]) && <span className="ml-1 rounded-full bg-white/5 px-1.5 text-[10px] font-normal text-slate-400">parcial</span>}
                      </td>
                    ))}
                    <td className="text-right">{ult != null && pen != null && k(anoHoje, i + 1) < ymHoje ? <Cresc a={ult} b={pen} /> : ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-400">Clique num mês pra abrir ele no Início.</p>
      </Cartao>
    </div>
  )
}
