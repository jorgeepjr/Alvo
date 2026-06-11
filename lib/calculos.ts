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

interface SugestaoMeta {
  conservadora: number
  moderada: number
  agressiva: number
}

/**
 * Calcula sugestões de meta para o mês seguinte com base no histórico
 * do mesmo mês nos últimos 3 anos.
 * - conservadora: média dos 3 anos
 * - moderada: +10% sobre o melhor resultado
 * - agressiva: +15% sobre o melhor resultado
 */
export function calcularSugestaoMeta(historico: number[]): SugestaoMeta {
  const media = historico.reduce((a, b) => a + b, 0) / historico.length
  const melhor = Math.max(...historico)
  return {
    conservadora: media,
    moderada: melhor * 1.1,
    agressiva: melhor * 1.15,
  }
}
