import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { carregarConfig, carregarMes } from '@/lib/dados-mes'
import { mesSelecionado } from '@/lib/mes-selecionado'
import { addMes, anoDe, DIAS_SEMANA, diaSemana, hojeBR, ymDe } from '@/lib/datas'
import { calcularComissao } from '@/lib/comissao'
import { TopoPagina } from '@/components/topo-pagina'
import { AvisosMes } from '@/components/avisos-mes'
import { BlocoMes, Cartao, dadosGraficoMes, R, R0 } from '@/components/bloco-mes'
import { MesAtualChart } from '@/components/mes-atual-chart'
import { alternarHabito } from '@/app/gestor/rotina/actions'

export default async function MeuDia({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('profiles').select('nome, perfil').eq('id', user!.id).single()
  if (perfil?.perfil === 'gestor') redirect('/gestor')
  const id = user!.id
  const hoje = hojeBR()
  const ymHoje = ymDe(hoje)
  const ym = await mesSelecionado(sp)
  const dia = Number(hoje.slice(8, 10))

  const [D, atual, anterior, cfg, { data: habitos }, { data: feitos }, { data: vendasHoje }] = await Promise.all([
    carregarMes(supabase, ym, hoje),
    ym === ymHoje ? null : carregarMes(supabase, ymHoje, hoje),
    dia <= 5 ? carregarMes(supabase, addMes(ymHoje, -1), hoje) : null,
    carregarConfig(supabase),
    supabase.from('habitos').select('*').eq('ativo', true).order('ordem'),
    supabase.from('habitos_feitos').select('habito_id').eq('vendedor_id', id).eq('data', hoje),
    supabase.from('vendas').select('valor').eq('vendedor_id', id).eq('data', hoje),
  ])
  const H = atual ?? D
  const I = D.porVendedor[id]
  const cotaHoje = H.diasVend[id]?.find((d) => d.data === hoje)?.cota ?? 0
  const vendidoHoje = (vendasHoje ?? []).reduce((a, s) => a + Number(s.valor), 0) || H.lancamentos.filter((l) => l.vendedor_id === id && l.data === hoje).reduce((a, l) => a + l.valor, 0)
  const feito = new Set((feitos ?? []).map((f) => f.habito_id))
  const HB = habitos ?? []
  const vendaPorDia: Record<string, number> = {}
  for (const l of D.lancamentos.filter((l) => l.vendedor_id === id)) vendaPorDia[l.data] = (vendaPorDia[l.data] ?? 0) + l.valor
  const fator = D.meta && I ? I.meta / D.meta : 0
  const grafico = I ? dadosGraficoMes(I, D.diasVend[id] ?? [], vendaPorDia, D.curvaAnoPassado.map((v) => v * fator)) : []
  const com = I ? calcularComissao(I.vendido, I.meta, { pctComMeta: cfg.comMeta, pctSemMeta: cfg.comSem }) : null

  if (!I) return <p className="text-slate-400">Seu usuário não está ativo como vendedor. Fale com o gestor.</p>

  return (
    <div className="space-y-4">
      <TopoPagina area="Hoje" titulo="Meu dia" ym={ym} ajuda="/painel/manuais" descricao="Seu dia e seu mês, sem enrolação." />
      <AvisosMes hoje={hoje} atual={H} anterior={anterior} cfg={cfg} vendedorId={id} gestor={false} ymSelecionado={ym} />

      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-400/10 to-violet-400/10 p-4">
        <div className="text-2xl font-black">Oi, {perfil?.nome}! 👋</div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-4">
          <BlocoMes i={I} titulo="📅 Seu mês" />
          <Cartao titulo="📈 Seu mês × sua meta">
            <MesAtualChart dados={grafico} anoAtual={anoDe(ym)} anoPassado={anoDe(ym) - 1} />
          </Cartao>
        </div>
        <div className="space-y-4">
          <Cartao id="vHoje" titulo="☀️ Hoje">
            <div className="grid grid-cols-2 gap-3">
              <div><b className="block text-2xl">{R0(cotaHoje)}</b><span className="text-xs text-slate-400">sua cota de hoje ({DIAS_SEMANA[diaSemana(hoje)]})</span></div>
              <div><b className={`block text-2xl ${cotaHoje && vendidoHoje >= cotaHoje ? 'text-emerald-300' : ''}`}>{R(vendidoHoje)}</b><span className="text-xs text-slate-400">vendido até agora</span></div>
            </div>
            <div className="mt-3 h-2.5 rounded-full bg-[#0b1324]"><i className="block h-full rounded-full bg-cyan-400" style={{ width: `${Math.min(100, cotaHoje ? (vendidoHoje / cotaHoje) * 100 : 0)}%` }} /></div>
            <Link href="/painel/lancamento" className="mt-3 block w-full rounded-xl bg-cyan-400 py-3.5 text-center text-base font-bold text-[#04111a] hover:bg-cyan-300">✍️ Registrar uma venda</Link>
          </Cartao>

          {HB.length > 0 && (
            <Cartao id="vHab" titulo={`✅ Seus ${HB.length} hábitos de hoje`}>
              {HB.map((h) => {
                const ok = feito.has(h.id)
                return (
                  <form key={h.id} action={alternarHabito.bind(null, h.id)}>
                    <button className={`mb-2 flex w-full items-center gap-3 rounded-xl border p-3 text-left ${ok ? 'border-emerald-400 bg-emerald-400/10' : 'border-transparent bg-[#16213a]'}`}>
                      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 font-black ${ok ? 'border-emerald-400 bg-emerald-400 text-[#04111a]' : 'border-slate-500'}`}>{ok ? '✓' : ''}</span>
                      <span>{h.texto}</span>
                    </button>
                  </form>
                )
              })}
              <p className="text-xs text-slate-400">{HB.filter((h) => feito.has(h.id)).length}/{HB.length} feitos {HB.every((h) => feito.has(h.id)) ? '🎉' : ''}</p>
            </Cartao>
          )}

          {com && (
            <Cartao titulo={`💰 Sua comissão${I.fechado ? '' : ' (parcial)'}`}>
              <b className="block text-2xl">{R(com.comissao)}</b>
              <span className="text-xs text-slate-400">
                {com.percentual}% de {R0(I.vendido)} · {com.bateu ? `meta batida: ${cfg.comMeta}%` : `se bater a meta vira ${cfg.comMeta}% (${R(I.meta * cfg.comMeta / 100)}+)`}
              </span>
            </Cartao>
          )}
        </div>
      </div>
    </div>
  )
}
