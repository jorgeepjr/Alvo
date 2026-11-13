import { addMes, diaSemana, mesmoDiaAnoPassado, ymDe } from '@/lib/datas'

// Como o Junior monta a meta (12/11/2026):
// - cada dia recebe a venda do MESMO DIA DA SEMANA do ano passado (364 dias antes,
//   o que alinha a Black Friday) — a meta do mês já tem os +20%, então o peso
//   proporcional dá exatamente "venda do ano passado + 20%";
// - o dia do ano passado que sobra (o mês começa em outro dia da semana, ou o dia
//   equivalente deste ano é feriado/fechado) vai pro ÚLTIMO dia útil do mês;
// - dia sem venda no ano passado recebe a média do mesmo dia da semana.

const PESO_SEMANA: Record<number, number> = { 0: 1, 1: 0.7, 2: 0.8, 3: 0.8, 4: 0.9, 5: 1.1, 6: 1.4 }

export function pesosPorDiaSemana(dias: { data: string; situacao: string }[]): Record<string, number> {
  const W: Record<string, number> = {}
  for (const d of dias) W[d.data] = d.situacao === 'normal' ? PESO_SEMANA[diaSemana(d.data)] : 0
  return W
}

/**
 * Peso de cada dia do mês pela venda do ano passado.
 * `dias` = todos os dias do mês com a situação; `vendaAnoPassado` = venda por dia
 * do mesmo mês do ano passado. Sem histórico, cai no peso do dia da semana.
 */
export function pesosAnoPassado(
  dias: { data: string; situacao: string }[],
  vendaAnoPassado: Record<string, number>,
): Record<string, number> {
  if (!dias.length) return {}
  const ymAnt = addMes(ymDe(dias[0].data), -12)
  const temHist = Object.entries(vendaAnoPassado).some(([k, v]) => k.startsWith(ymAnt) && v > 0)
  if (!temHist) return pesosPorDiaSemana(dias)

  const W: Record<string, number> = {}
  const usados = new Set<string>()
  let sobra = 0
  for (const d of dias) {
    const l = mesmoDiaAnoPassado(d.data)
    if (ymDe(l) === ymAnt) {
      usados.add(l)
      const v = vendaAnoPassado[l] ?? 0
      if (d.situacao === 'normal') W[d.data] = v
      else {
        W[d.data] = 0
        sobra += v
      }
    } else W[d.data] = 0
  }
  for (const [k, v] of Object.entries(vendaAnoPassado)) if (k.startsWith(ymAnt) && !usados.has(k)) sobra += v

  const normais = dias.filter((d) => d.situacao === 'normal')
  // Dia útil sem venda no ano passado: média do mesmo dia da semana.
  for (const d of normais) {
    if (W[d.data] > 0) continue
    const mesmos = normais.filter((y) => diaSemana(y.data) === diaSemana(d.data) && W[y.data] > 0)
    W[d.data] = mesmos.length ? mesmos.reduce((a, y) => a + W[y.data], 0) / mesmos.length : 1
  }
  const ult = normais[normais.length - 1]
  if (ult) W[ult.data] += sobra
  return W
}
