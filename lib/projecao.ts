// "Vou bater a meta?" — projeção em faixa (análise de 12/11/2026, seção 5).
// Funções puras: recebem os números do mês e devolvem a leitura.

export interface DiaCotaInfo {
  data: string
  situacao: 'normal' | 'feriado' | 'fechado' | string
  cota: number
}

export interface EntradaMes {
  ym: string
  hoje: string
  meta: number
  dias: DiaCotaInfo[]
  /** venda lançada por dia (só dias com lançamento) */
  vendaPorDia: Record<string, number>
  atendimentos: number
  pecas: number
  valorWhatsapp?: number
  /** venda ACUMULADA do mesmo mês do ano passado, dia 1..N (índice 0 = dia 1) */
  curvaAnoPassado?: number[]
}

export interface InfoMes {
  ym: string
  meta: number
  vendido: number
  atendimentos: number
  pecas: number
  valorWhatsapp: number
  fechado: boolean
  futuro: boolean
  diasUteis: number
  diasLancados: number
  ultimoLancado: string | null
  /** onde deveria estar: soma das cotas até o último dia lançado */
  cotaAte: number
  /** média por dia lançado × dias úteis (a mais pessimista) */
  pessimista: number
  /** meta × vendido ÷ cota até o último dia lançado */
  provavel: number
  /** vendido ÷ fração do mês que o ano passado já tinha vendido nesse dia */
  pelaCurva: number
  falta: number
  diasRestantes: number
  porDia: number
  media: number
  ticket: number
  pa: number
  precoMedio: number
  pct: number
}

export function infoMes(e: EntradaMes): InfoMes {
  const ymHoje = e.hoje.slice(0, 7)
  const fechado = e.ym < ymHoje
  const futuro = e.ym > ymHoje
  const uteis = e.dias.filter((d) => d.situacao === 'normal')
  const lancados = Object.keys(e.vendaPorDia).filter((d) => d.startsWith(e.ym)).sort()
  const vendido = lancados.reduce((a, d) => a + (e.vendaPorDia[d] ?? 0), 0)
  const ultimo = lancados[lancados.length - 1] ?? null
  const cotaAte = ultimo ? uteis.filter((d) => d.data <= ultimo).reduce((a, d) => a + d.cota, 0) : 0
  // Dias que ainda faltam: úteis depois do último lançado e a partir de hoje
  // (dia passado sem lançamento não é "dia que falta", é dia esquecido).
  const corte = ultimo && ultimo >= e.hoje ? ultimo : e.hoje
  const diasRestantes = fechado ? 0 : uteis.filter((d) => d.data >= corte && (!ultimo || d.data > ultimo)).length
  const diasLancados = lancados.length
  const pessimista = diasLancados ? (vendido / diasLancados) * uteis.length : 0
  const provavel = cotaAte > 0 ? (e.meta * vendido) / cotaAte : 0
  let pelaCurva = 0
  const curva = e.curvaAnoPassado ?? []
  if (ultimo && curva.length) {
    const idx = Math.min(Number(ultimo.slice(8, 10)) - 1, curva.length - 1)
    const total = curva[curva.length - 1]
    const frac = total > 0 ? curva[idx] / total : 0
    pelaCurva = frac > 0 ? vendido / frac : 0
  }
  const falta = Math.max(0, e.meta - vendido)
  const at = e.atendimentos
  return {
    ym: e.ym,
    meta: e.meta,
    vendido,
    atendimentos: at,
    pecas: e.pecas,
    valorWhatsapp: e.valorWhatsapp ?? 0,
    fechado,
    futuro,
    diasUteis: uteis.length,
    diasLancados,
    ultimoLancado: ultimo,
    cotaAte,
    pessimista: fechado ? vendido : pessimista,
    provavel: fechado ? vendido : provavel,
    pelaCurva: fechado ? vendido : pelaCurva,
    falta,
    diasRestantes,
    porDia: diasRestantes ? falta / diasRestantes : 0,
    media: diasLancados ? vendido / diasLancados : 0,
    ticket: at ? vendido / at : 0,
    pa: at ? e.pecas / at : 0,
    precoMedio: e.pecas ? vendido / e.pecas : 0,
    pct: e.meta ? vendido / e.meta : 0,
  }
}

export type Tom = 'ok' | 'warn' | 'bad' | 'neu'

/** Leitura do mês: verde no ritmo, amarelo no limite, vermelho = mudar a estratégia. */
export function statusMes(i: InfoMes): { tom: Tom; texto: string } {
  if (!i.meta) return { tom: 'neu', texto: 'Sem meta' }
  if (i.fechado) return i.vendido >= i.meta ? { tom: 'ok', texto: '✅ Bateu a meta' } : { tom: 'bad', texto: '❌ Não bateu' }
  if (!i.diasLancados) return { tom: 'neu', texto: 'Sem lançamento ainda' }
  const lo = Math.min(i.pessimista, i.provavel)
  const hi = Math.max(i.pessimista, i.provavel)
  if (hi < i.meta) return { tom: 'bad', texto: '🚨 No ritmo atual não bate: hora de mudar a estratégia' }
  if (lo < i.meta) return { tom: 'warn', texto: '⚠️ Pode bater, mas está no limite' }
  return { tom: 'ok', texto: '✅ No ritmo de bater a meta' }
}

/** Qual avaliação vale hoje: 1 = meio do mês, 2 = reta final, 0 = nenhuma. */
export function avaliacaoDoDia(diaDoMes: number, cfg: { meio: number; finalIni: number; finalFim: number }): 0 | 1 | 2 {
  if (diaDoMes >= cfg.finalIni && diaDoMes <= cfg.finalFim) return 2
  if (diaDoMes >= cfg.meio && diaDoMes < cfg.finalIni) return 1
  return 0
}

/**
 * Dias úteis que já passaram (antes de hoje: o dia fecha às 18h, o aviso
 * aparece no dia seguinte) e que não têm lançamento do vendedor.
 */
export function diasPendentes(
  diasUteis: string[],
  hoje: string,
  vendedores: { id: string; nome: string }[],
  lancados: Set<string>, // chave `${vendedor_id}|${data}`
): { vendedorId: string; nome: string; data: string }[] {
  const out: { vendedorId: string; nome: string; data: string }[] = []
  for (const d of [...diasUteis].sort()) {
    if (d >= hoje) continue
    for (const v of vendedores) if (!lancados.has(`${v.id}|${d}`)) out.push({ vendedorId: v.id, nome: v.nome, data: d })
  }
  return out
}

/** Acumula uma série de vendas por dia (dia 1..N). */
export function acumular(valores: number[]): number[] {
  let ac = 0
  return valores.map((v) => (ac += v))
}
