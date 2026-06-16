/**
 * Formata um valor numérico como moeda brasileira (separador de milhar "."
 * e 2 casas decimais), sem o prefixo "R$".
 */
export function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Projeta o valor final do mês com base no ritmo atual de vendas.
 * Fórmula: (valor_acumulado / dias_trabalhados) * total_dias_uteis_no_mes
 */
export function calcularProjecao(
  valorAcumulado: number,
  diasTrabalhados: number,
  totalDiasUteis: number
): number {
  if (diasTrabalhados === 0) return 0
  return (valorAcumulado / diasTrabalhados) * totalDiasUteis
}

/**
 * Ticket médio = valor / quantidade (peças ou atendimentos)
 */
export function calcularTicketMedio(valor: number, quantidade: number): number {
  if (quantidade === 0) return 0
  return valor / quantidade
}

interface DiaPeso {
  data: string
  peso: number
}

interface DiaCota {
  data: string
  cota: number
}

/**
 * Distribui uma meta mensal entre os dias do mês proporcionalmente ao peso de cada dia.
 * Dias com peso 0 (feriado/fechado) recebem cota 0.
 */
export function distribuirCotaPorPeso(dias: DiaPeso[], metaMensal: number): DiaCota[] {
  const somaPesos = dias.reduce((acc, d) => acc + d.peso, 0)
  if (somaPesos === 0) {
    return dias.map((d) => ({ data: d.data, cota: 0 }))
  }
  return dias.map((d) => ({
    data: d.data,
    cota: (d.peso / somaPesos) * metaMensal,
  }))
}

/**
 * Distribui um total inteiro entre os dias proporcionalmente ao peso,
 * arredondando para inteiros de forma que a SOMA seja exatamente igual
 * ao total (método do maior resto). Dias com peso 0 recebem 0.
 */
export function distribuirCotaInteira(dias: DiaPeso[], total: number): DiaCota[] {
  const totalInt = Math.round(total)
  const somaPesos = dias.reduce((acc, d) => acc + d.peso, 0)
  if (somaPesos === 0 || totalInt === 0) {
    return dias.map((d) => ({ data: d.data, cota: 0 }))
  }

  // Valor exato por dia + parte inteira (piso) e resto fracionário
  const exatos = dias.map((d) => ({
    data: d.data,
    valor: (d.peso / somaPesos) * totalInt,
  }))
  const base = exatos.map((e) => ({ data: e.data, cota: Math.floor(e.valor), resto: e.valor - Math.floor(e.valor) }))

  let alocado = base.reduce((acc, b) => acc + b.cota, 0)
  let sobra = totalInt - alocado

  // Distribui as unidades restantes para os dias com maior resto
  const ordenadosPorResto = [...base].sort((a, b) => b.resto - a.resto)
  let i = 0
  while (sobra > 0 && ordenadosPorResto.length > 0) {
    ordenadosPorResto[i % ordenadosPorResto.length].cota += 1
    sobra--
    i++
  }

  return base.map((b) => ({ data: b.data, cota: b.cota }))
}

interface SugestaoMeta {
  conservadora: number
  moderada: number
  agressiva: number
  tendencia: number | null
  tendenciaAtendimentos: number | null
  tendenciaPecas: number | null
}

interface HistoricoMes {
  ano: number
  mes: number
  venda_total: number
  atendimentos?: number
  pecas?: number
}

/**
 * Calcula a taxa de crescimento média ano-a-ano (ex: 1.10 = +10%) com base
 * no histórico, comparando cada mês com o mesmo mês do ano anterior
 * (estilo "evolução vs. ano anterior" usado por grandes redes).
 * `campo` define qual métrica do histórico é usada (vendas, atendimentos, peças).
 */
export function calcularCrescimentoMedioAnual(
  historico: HistoricoMes[],
  campo: 'venda_total' | 'atendimentos' | 'pecas' = 'venda_total'
): number {
  const porMes = new Map<number, { ano: number; valor: number }[]>()
  for (const h of historico) {
    if (!porMes.has(h.mes)) porMes.set(h.mes, [])
    porMes.get(h.mes)!.push({ ano: h.ano, valor: Number(h[campo] ?? 0) })
  }

  const taxas: number[] = []
  for (const registros of porMes.values()) {
    registros.sort((a, b) => a.ano - b.ano)
    for (let i = 1; i < registros.length; i++) {
      const anterior = registros[i - 1].valor
      const atual = registros[i].valor
      if (anterior > 0) taxas.push(atual / anterior)
    }
  }

  if (taxas.length === 0) return 1
  return taxas.reduce((a, b) => a + b, 0) / taxas.length
}

/**
 * Sugestão por tendência: pega o valor do mesmo mês no ano anterior e
 * aplica a taxa de crescimento média histórica da loja para essa métrica.
 * Retorna null se não houver dado do mesmo mês no ano anterior.
 */
export function calcularSugestaoTendencia(
  historico: HistoricoMes[],
  ano: number,
  mes: number,
  campo: 'venda_total' | 'atendimentos' | 'pecas' = 'venda_total'
): number | null {
  const anoAnterior = historico.find((h) => h.ano === ano - 1 && h.mes === mes)
  if (!anoAnterior) return null
  const valorBase = Number(anoAnterior[campo] ?? 0)
  if (valorBase <= 0) return null
  const crescimento = calcularCrescimentoMedioAnual(historico, campo)
  return valorBase * crescimento
}

/**
 * Calcula sugestões de meta para o mês seguinte com base no histórico
 * do mesmo mês nos últimos 3 anos.
 * - conservadora: média dos 3 anos
 * - moderada: +10% sobre o melhor resultado
 * - agressiva: +15% sobre o melhor resultado
 */
export function calcularSugestaoMeta(
  historico: number[],
  tendencia: number | null = null,
  tendenciaAtendimentos: number | null = null,
  tendenciaPecas: number | null = null
): SugestaoMeta {
  const media = historico.reduce((a, b) => a + b, 0) / historico.length
  const melhor = Math.max(...historico)
  return {
    conservadora: media,
    moderada: melhor * 1.1,
    agressiva: melhor * 1.15,
    tendencia,
    tendenciaAtendimentos,
    tendenciaPecas,
  }
}
