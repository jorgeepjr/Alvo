import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { carregarConfig, carregarMes } from '@/lib/dados-mes'
import { mesSelecionado } from '@/lib/mes-selecionado'
import { addMes, anoDe, ddmm, DIAS_SEMANA, diaSemana, hojeBR, MESES_NOME, mesDe, nomeMes, nomeMesCurto, ymDe } from '@/lib/datas'
import { statusMes } from '@/lib/projecao'
import { TopoPagina } from '@/components/topo-pagina'
import { AvisosMes } from '@/components/avisos-mes'
import { BlocoMes, Cartao, dadosGraficoMes, N1, OrigemVenda, P, R, R0, Seta } from '@/components/bloco-mes'
import { MesAtualChart } from '@/components/mes-atual-chart'
import { ResumoDia } from './resumo-dia'

const CORES = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24']

export default async function Inicio({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sp = await searchParams
  const supabase = await createClient()
  const hoje = hojeBR()
  const ymHoje = ymDe(hoje)
  const ym = await mesSelecionado(sp)
  const dia = Number(hoje.slice(8, 10))

  const [D, atual, anterior, cfg] = await Promise.all([
    carregarMes(supabase, ym, hoje),
    ym === ymHoje ? null : carregarMes(supabase, ymHoje, hoje),
    dia <= 5 ? carregarMes(supabase, addMes(ymHoje, -1), hoje) : null,
    carregarConfig(supabase),
  ])
  const H = atual ?? D // o mês de hoje (pros avisos e o card "Hoje")
  const I = D.loja
  const ehAtual = ym === ymHoje

  const vendaPorDia: Record<string, number> = {}
  for (const l of D.lancamentos) vendaPorDia[l.data] = (vendaPorDia[l.data] ?? 0) + l.valor
  const grafico = dadosGraficoMes(I, D.diasLoja, vendaPorDia, D.curvaAnoPassado)

  // Hoje e ontem (último dia útil antes de hoje, mesmo que seja do mês anterior)
  const lancH = H.lancamentos.filter((l) => l.data === hoje)
  const vendidoHoje = lancH.reduce((a, l) => a + l.valor, 0)
  const cotaHoje = H.diasLoja.find((d) => d.data === hoje)?.cota ?? 0
  const uteisAntes = [...(anterior?.diasLoja ?? []), ...H.diasLoja].filter((d) => d.situacao === 'normal' && d.data < hoje)
  const ontemDia = uteisAntes[uteisAntes.length - 1]
  const ontem = ontemDia?.data
  const lancOntem = [...(anterior?.lancamentos ?? []), ...H.lancamentos].filter((l) => l.data === ontem)
  const vendOntem = lancOntem.reduce((a, l) => a + l.valor, 0)
  const cotaOntem = ontemDia?.cota ?? 0

  const ranking = D.vendedores
    .map((v, k) => ({ v, cor: CORES[k % CORES.length], x: D.porVendedor[v.id] }))
    .sort((a, b) => b.x.pct - a.x.pct)

  // Resumo pro grupo (ritual de 5 minutos do fim do dia)
  let resumo = ''
  if (ehAtual && ontem) {
    const at = lancOntem.reduce((a, l) => a + l.atendimentos, 0)
    const pc = lancOntem.reduce((a, l) => a + l.pecas, 0)
    const waOntem = lancOntem.reduce((a, l) => a + Number(l.valor_whatsapp ?? 0), 0)
    const porV = H.vendedores
      .map((v) => {
        const x = lancOntem.filter((l) => l.vendedor_id === v.id)
        return `• ${v.nome}: ${x.length ? `${R(x.reduce((a, l) => a + l.valor, 0))} (${x.reduce((a, l) => a + l.pecas, 0)} peças)` : '⚠️ não lançou'}`
      })
      .join('\n')
    resumo =
      `📊 Resumo de ${ddmm(ontem)} — ZYNK\n` +
      `💰 Vendido: ${R(vendOntem)}${cotaOntem ? ` (cota ${R0(cotaOntem)}) ${vendOntem >= cotaOntem ? '✅' : '⚠️'}` : ''}\n` +
      `🏪 Loja ${P(vendOntem ? 1 - waOntem / vendOntem : 0)} · 💬 WhatsApp ${P(vendOntem ? waOntem / vendOntem : 0)}\n` +
      `👥 Atendimentos: ${at} | 👕 Peças: ${pc} | 🎟️ Ticket: ${R(at ? vendOntem / at : 0)}\n\n` +
      `Por vendedor:\n${porV}\n\n` +
      `📅 Mês: ${R(I.vendido)} de ${R0(I.meta)} (${P(I.pct)}) | Provável: ${R0(I.provavel)} (${P(I.meta ? I.provavel / I.meta : 0)})\n` +
      `🎯 Precisa ${R0(I.porDia)} por dia nos ${I.diasRestantes} dias que faltam`
  }

  return (
    <div className="space-y-4">
      <TopoPagina
        area="Hoje"
        titulo="Início"
        ym={ym}
        ajuda="/gestor/ajuda#inicio"
        descricao={<>O dia e o mês da loja numa tela só. <b className="text-slate-200">Escolha o mês lá em cima</b> pra ver outro.</>}
      />

      <AvisosMes hoje={hoje} atual={H} anterior={anterior} cfg={cfg} gestor ymSelecionado={ym} superMeta={H.superMeta} />

      <div className="grid items-start gap-4 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-4">
          <BlocoMes i={I} titulo={ehAtual ? `📅 ${MESES_NOME[mesDe(ym) - 1]} até agora` : `📅 ${nomeMes(ym)}${I.fechado ? ' (fechado)' : ''}`} />
          <Cartao id="bGraf" titulo={`📈 Vendido no mês × meta × ${anoDe(ym) - 1}`}>
            <MesAtualChart dados={grafico} anoAtual={anoDe(ym)} anoPassado={anoDe(ym) - 1} />
          </Cartao>
        </div>

        <div className="space-y-4">
          {ehAtual && (
            <Cartao id="bHoje" titulo={`☀️ Hoje, ${ddmm(hoje)} (${DIAS_SEMANA[diaSemana(hoje)]})`}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <b className="block text-2xl">{R0(cotaHoje)}</b>
                  <span className="text-xs text-slate-400">cota de hoje</span>
                </div>
                <div>
                  <b className="block text-2xl">{vendidoHoje ? R(vendidoHoje) : '—'}</b>
                  <span className="text-xs text-slate-400">{vendidoHoje ? 'vendido hoje até agora' : 'ninguém lançou ainda'}</span>
                </div>
              </div>
              {ontem && (
                <p className="mt-3 text-xs text-slate-400">
                  Último dia útil ({ddmm(ontem)}): <b className={vendOntem >= cotaOntem ? 'text-emerald-300' : 'text-amber-300'}>{R(vendOntem)}</b> de {R0(cotaOntem)} {vendOntem >= cotaOntem && cotaOntem ? '✅' : ''}
                </p>
              )}
            </Cartao>
          )}

          <Cartao id="bRank" titulo={`🏆 Vendedores · ${nomeMesCurto(ym)}`}>
            {ranking.map(({ v, cor, x }, k) => {
              const st = statusMes(x)
              return (
                <Link key={v.id} href={`/gestor/vendedores/${v.id}`} title={`Ver o histórico de ${v.nome}`} className="flex items-center gap-3 border-b border-white/5 py-2.5 last:border-0 hover:bg-white/[.02]">
                  <div className="w-7 text-xl font-black text-cyan-300">{k + 1}º</div>
                  <div className="grid h-9 w-9 place-items-center rounded-full font-extrabold text-[#04111a]" style={{ background: cor }}>{v.nome[0]}</div>
                  <div className="flex-1">
                    <b>{v.nome}</b>
                    <div className="text-xs text-slate-400">{R0(x.vendido)} de {R0(x.meta)} · {x.atendimentos} atend.</div>
                    <div className="mt-1 h-1.5 rounded-full bg-[#0b1324]"><i className="block h-full rounded-full" style={{ width: `${Math.min(100, x.pct * 100)}%`, background: cor }} /></div>
                  </div>
                  <div className="text-right text-xs">
                    <b className="text-base">{P(x.pct)}</b>
                    <div>{x.fechado ? <Seta v={x.vendido - x.meta} txt="da meta" /> : x.diasLancados ? <Seta v={x.vendido - x.cotaAte} /> : null}</div>
                    {!x.fechado && x.diasLancados > 0 && x.meta > 0 && (
                      <div className={st.tom === 'ok' ? 'text-emerald-300' : st.tom === 'warn' ? 'text-amber-300' : 'text-red-300'}>provável {P(x.provavel / x.meta)}</div>
                    )}
                  </div>
                </Link>
              )
            })}
            <p className="mt-2 text-xs text-slate-400">▲ na frente / ▼ atrás de onde deveria estar {I.fechado ? '(meta do mês)' : 'até o último dia lançado'}. Clique pra ver o histórico.</p>
          </Cartao>

          <Cartao id="bInd" titulo={`🧮 Indicadores · ${nomeMesCurto(ym)}`}>
            <div className="grid grid-cols-3 gap-3">
              <div title="Quanto cada cliente atendido gastou, em média (valor ÷ atendimentos)."><b className="block text-xl">{R(I.ticket)}</b><span className="text-xs text-slate-400">ticket médio</span></div>
              <div title="Peças por atendimento (peças ÷ atendimentos). Subir o PA sobe o ticket."><b className="block text-xl">{N1(I.pa)}</b><span className="text-xs text-slate-400">PA</span></div>
              <div title="Preço médio de cada peça vendida (valor ÷ peças)."><b className="block text-xl">{R(I.precoMedio)}</b><span className="text-xs text-slate-400">preço médio</span></div>
            </div>
            <div className="mt-4">
              <div className="mb-1.5 text-xs font-semibold text-slate-400">De onde veio a venda</div>
              <OrigemVenda vendido={I.vendido} whatsapp={I.valorWhatsapp} />
              <div className="mt-2 space-y-0.5">
                {ranking.map(({ v, x }) => (
                  <div key={v.id} className="flex justify-between text-xs text-slate-400"><span>{v.nome}</span><OrigemVenda vendido={x.vendido} whatsapp={x.valorWhatsapp} compacto /></div>
                ))}
              </div>
            </div>
          </Cartao>

          {resumo && (
            <Cartao id="bResumo" titulo="📲 Resumo pro grupo da loja">
              <ResumoDia texto={resumo} />
            </Cartao>
          )}

          {D.superMeta > 0 && (
            <Cartao titulo="🌟 Super meta da loja">
              <div className="h-2.5 rounded-full bg-[#0b1324]"><i className="block h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, (I.vendido / D.superMeta) * 100)}%` }} /></div>
              <p className="mt-2 text-xs text-slate-400">{R0(I.vendido)} de {R0(D.superMeta)}{D.superPremio ? ` · prêmio: ${D.superPremio}` : ''}</p>
            </Cartao>
          )}
        </div>
      </div>
    </div>
  )
}
