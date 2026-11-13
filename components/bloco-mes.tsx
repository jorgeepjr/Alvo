import Link from 'next/link'
import { formatBRL } from '@/lib/calculos'
import { statusMes, type InfoMes, type Tom } from '@/lib/projecao'
import { datasDoMes } from '@/lib/datas'

export const R = (v: number) => `R$ ${formatBRL(v)}`
export const R0 = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`
export const P = (v: number) => `${Math.round(v * 100)}%`
export const N1 = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })

const TOM: Record<Tom, string> = {
  ok: 'border-emerald-400/35 bg-emerald-400/10',
  warn: 'border-amber-400/35 bg-amber-400/10',
  bad: 'border-red-400/35 bg-red-400/10',
  neu: 'border-cyan-400/40 bg-cyan-400/10',
}
const TAG: Record<Tom, string> = {
  ok: 'bg-emerald-400/15 text-emerald-300',
  warn: 'bg-amber-400/15 text-amber-300',
  bad: 'bg-red-400/15 text-red-300',
  neu: 'bg-white/5 text-slate-400',
}

export function Tag({ tom, children }: { tom: Tom; children: React.ReactNode }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${TAG[tom]}`}>{children}</span>
}

export function Aviso({ tom, icone, titulo, children, acao, id }: { tom: Tom; icone: string; titulo: React.ReactNode; children?: React.ReactNode; acao?: { href: string; texto: string }; id?: string }) {
  return (
    <div id={id} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${TOM[tom]}`}>
      <div className="text-xl leading-none">{icone}</div>
      <div className="flex-1 text-sm">
        <b className="text-[15px]">{titulo}</b>
        {children && <div className="mt-0.5 text-slate-300">{children}</div>}
      </div>
      {acao && (
        <Link href={acao.href} className="whitespace-nowrap text-sm font-bold text-cyan-300 hover:underline">
          {acao.texto}
        </Link>
      )}
    </div>
  )
}

export function Cartao({ titulo, extra, children, id, className = '' }: { titulo?: React.ReactNode; extra?: React.ReactNode; children: React.ReactNode; id?: string; className?: string }) {
  return (
    <section id={id} className={`rounded-2xl border border-white/10 bg-[#111a2d] p-4 ${className}`}>
      {titulo && (
        <h2 className="mb-3 flex items-center gap-2 text-[15.5px] font-semibold">
          {titulo}
          {extra && <span className="ml-auto">{extra}</span>}
        </h2>
      )}
      {children}
    </section>
  )
}

export function Seta({ v, txt }: { v: number; txt?: string }) {
  return (
    <span className={`whitespace-nowrap font-bold ${v >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
      {v >= 0 ? '▲' : '▼'} {R0(Math.abs(v))}
      {txt ? ` ${txt}` : ''}
    </span>
  )
}

/** O mês: vendido × meta, onde deveria estar, projeção em faixa e "precisa R$ X por dia". */
export function BlocoMes({ i, titulo }: { i: InfoMes; titulo: string }) {
  const st = statusMes(i)
  const lo = Math.min(i.pessimista, i.provavel)
  const hi = Math.max(i.pessimista, i.provavel)
  const emAndamento = !i.fechado && !i.futuro && i.meta > 0
  return (
    <Cartao id="bMes" titulo={titulo} extra={<Tag tom={st.tom}>{st.texto}</Tag>}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="text-xs text-slate-400">Vendido</span>
          <div className="text-3xl font-black">{R(i.vendido)}</div>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400">Meta</span>
          <div className="text-lg font-bold">
            {R0(i.meta)} · <span className="text-cyan-300">{P(i.pct)}</span>
          </div>
        </div>
      </div>
      <div className="relative mt-3 mb-1 h-2.5 rounded-full bg-[#0b1324]">
        <i className="block h-full rounded-full bg-cyan-400" style={{ width: `${Math.min(100, i.pct * 100)}%` }} />
        {emAndamento && i.cotaAte > 0 && (
          <span className="absolute -top-1 -bottom-1 w-0.5 bg-white/70" style={{ left: `${Math.min(100, (i.cotaAte / i.meta) * 100)}%` }} title="onde deveria estar" />
        )}
      </div>
      {emAndamento && i.diasLancados > 0 ? (
        <>
          <p className="text-xs text-slate-400">
            A marca branca é onde deveria estar até o último dia lançado ({R0(i.cotaAte)}).{' '}
            {i.vendido >= i.cotaAte ? <b className="text-emerald-300">Na frente {R0(i.vendido - i.cotaAte)}</b> : <b className="text-red-300">Atrás {R0(i.cotaAte - i.vendido)}</b>}
          </p>
          <div id="bProj" className="my-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Proj titulo="Se seguir a média" v={i.pessimista} meta={i.meta} dica="Média por dia lançado × dias úteis do mês. Trata todo dia como igual: é a conta mais pessimista." />
            <Proj titulo="Provável (pela cota)" v={i.provavel} meta={i.meta} destaque dica="Compara o vendido com a cota até o último dia lançado (que já pesa sexta e sábado mais) e aplica no mês." />
            <Proj titulo={`Pela curva de ${Number(i.ym.slice(0, 4)) - 1}`} v={i.pelaCurva} meta={i.meta} dica="Quanto do mês costumava estar vendido nesse mesmo dia no ano passado (pega a Black e o Natal)." />
          </div>
          <Aviso tom={i.media >= i.porDia ? 'ok' : 'warn'} icone="🎯" titulo={`Faltam ${R0(i.falta)} em ${i.diasRestantes} dias úteis → precisa ${R0(i.porDia)} por dia`}>
            Média até agora: {R0(i.media)} por dia {i.media >= i.porDia ? '✅ dá pra bater' : '⚠️ precisa acelerar'}. Deve fechar entre {R0(lo)} e {R0(hi)}.
          </Aviso>
        </>
      ) : i.meta > 0 && i.fechado ? (
        <p className="mt-1 text-xs text-slate-400">{i.vendido >= i.meta ? `Passou ${R0(i.vendido - i.meta)} da meta.` : `Ficou ${R0(i.meta - i.vendido)} abaixo da meta.`}</p>
      ) : !i.meta ? (
        <p className="mt-1 text-xs text-slate-400">Sem meta cadastrada pra esse mês. <Link href="/gestor/metas" className="text-cyan-300">Cadastrar →</Link></p>
      ) : (
        <p className="mt-1 text-xs text-slate-400">Ainda sem lançamento neste mês.</p>
      )}
    </Cartao>
  )
}

function Proj({ titulo, v, meta, destaque, dica }: { titulo: string; v: number; meta: number; destaque?: boolean; dica: string }) {
  return (
    <div className="rounded-xl bg-[#16213a] px-3 py-2.5" title={dica}>
      <span className="block text-xs text-slate-400">{titulo}</span>
      <b className={`text-lg ${destaque ? 'text-cyan-300' : ''}`}>{v ? R0(v) : '—'}</b> <span className="text-xs text-slate-400">{v && meta ? P(v / meta) : ''}</span>
    </div>
  )
}

/** Dados do gráfico do mês: vendido, projeção provável, ritmo da meta (cota acumulada) e ano passado. */
export function dadosGraficoMes(
  i: InfoMes,
  dias: { data: string; situacao: string; cota: number }[],
  vendaPorDia: Record<string, number>,
  curvaAnoPassado: number[],
) {
  const ult = i.ultimoLancado ? Number(i.ultimoLancado.slice(8, 10)) : 0
  const fator = i.cotaAte > 0 ? i.vendido / i.cotaAte : 1
  const cota = new Map(dias.map((d) => [d.data, d.situacao === 'normal' ? d.cota : 0]))
  let ac = 0
  let cm = 0
  let pj = 0
  return datasDoMes(i.ym).map((data, k) => {
    const dia = k + 1
    ac += vendaPorDia[data] ?? 0
    cm += cota.get(data) ?? 0
    let projecao: number | null = null
    if (!i.fechado && ult && dia >= ult) {
      if (dia === ult) pj = ac
      else pj += (cota.get(data) ?? 0) * fator
      projecao = Math.round(pj)
    }
    return {
      dia,
      atual: dia <= ult || i.fechado ? Math.round(ac) : null,
      projecao,
      meta: i.meta ? Math.round(cm) : null,
      anoPassado: curvaAnoPassado.length ? Math.round(curvaAnoPassado[Math.min(k, curvaAnoPassado.length - 1)]) : null,
    }
  })
}

/** De onde veio a venda: loja × WhatsApp, em % (pra saber onde pôr mais esforço). */
export function OrigemVenda({ vendido, whatsapp, compacto }: { vendido: number; whatsapp: number; compacto?: boolean }) {
  const pw = vendido > 0 ? Math.min(1, whatsapp / vendido) : 0
  const pl = vendido > 0 ? 1 - pw : 0
  if (compacto) return <span className="whitespace-nowrap text-xs">🏪 {P(pl)} · 💬 {P(pw)}</span>
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-[#0b1324]">
        <i className="block h-full bg-cyan-400" style={{ width: `${pl * 100}%` }} title="Loja" />
        <i className="block h-full bg-emerald-400" style={{ width: `${pw * 100}%` }} title="WhatsApp" />
      </div>
      <div className="mt-1.5 flex justify-between text-sm">
        <span>🏪 Loja <b>{P(pl)}</b> <span className="text-xs text-slate-400">{R0(vendido - whatsapp)}</span></span>
        <span>💬 WhatsApp <b className="text-emerald-300">{P(pw)}</b> <span className="text-xs text-slate-400">{R0(whatsapp)}</span></span>
      </div>
    </div>
  )
}
