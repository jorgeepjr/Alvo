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

  const alocado = base.reduce((acc, b) => acc + b.cota, 0)
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

/**
 * Distribui um total entre os dias proporcionalmente ao peso, com cada dia
 * arredondado para múltiplos de `passo` (ex.: R$ 100). O ÚLTIMO dia da lista
 * (com peso > 0) absorve a diferença do arredondamento, para a soma bater
 * exatamente com o total. Se o arredondamento deixar o último dia negativo,
 * cai para a distribuição inteira (sem valores redondos) para não gerar cota
 * negativa.
 */
export function distribuirCotaRedonda(dias: DiaPeso[], total: number, passo = 100): DiaCota[] {
  const totalInt = Math.round(total)
  const somaPesos = dias.reduce((acc, d) => acc + d.peso, 0)
  if (somaPesos === 0 || totalInt <= 0) {
    return dias.map((d) => ({ data: d.data, cota: 0 }))
  }
  let ultimo = -1
  dias.forEach((d, i) => {
    if (d.peso > 0) ultimo = i
  })
  const cotas = dias.map((d, i) => {
    if (d.peso <= 0 || i === ultimo) return 0
    return Math.round(((d.peso / somaPesos) * totalInt) / passo) * passo
  })
  const resto = totalInt - cotas.reduce((a, b) => a + b, 0)
  if (resto < 0) return distribuirCotaInteira(dias, totalInt)
  cotas[ultimo] = resto
  return dias.map((d, i) => ({ data: d.data, cota: cotas[i] }))
}

/**
 * Divide um total inteiro entre vendedores pelos percentuais, garantindo que a
 * soma das partes seja exatamente o total (método do maior resto). Em empate
 * de resto (ex.: 9 meio a meio), a unidade extra vai para o vendedor da vez,
 * girando pela posição `rodada` (use o índice do dia), para alternar entre eles.
 */
export function dividirEntreVendedores(total: number, percentuais: number[], rodada = 0): number[] {
  const totalInt = Math.round(total)
  const soma = percentuais.reduce((a, b) => a + b, 0)
  const n = percentuais.length
  if (n === 0) return []
  if (soma <= 0 || totalInt <= 0) return percentuais.map(() => 0)
  // Se os percentuais somam menos de 100, cada um leva só a sua parte (sem forçar o total).
  const alvo = soma >= 100 ? totalInt : (totalInt * soma) / 100
  const alvoInt = Math.round(alvo)
  const exatos = percentuais.map((p) => (p / soma) * alvoInt)
  const partes = exatos.map((e) => Math.floor(e))
  let sobra = alvoInt - partes.reduce((a, b) => a + b, 0)
  const ordem = exatos
    .map((e, i) => ({ i, resto: Math.round((e - Math.floor(e)) * 1e6) / 1e6, giro: (i - (rodada % n) + n) % n }))
    .sort((a, b) => b.resto - a.resto || a.giro - b.giro)
  for (let k = 0; sobra > 0; k++, sobra--) partes[ordem[k % n].i] += 1
  return partes
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
 * Crescimento RECENTE da loja (ex.: 1.20 = +20%): soma dos últimos `meses`
 * meses do histórico que têm o mesmo mês do ano anterior, dividida pela soma
 * desses mesmos meses um ano antes. Usa só o histórico ANTES de (ano, mes)
 * quando informado. Diferente da média simples de todas as taxas, não é
 * distorcido por picos antigos (ex.: um mês com +160%).
 */
export function calcularCrescimentoRecente(
  historico: HistoricoMes[],
  campo: 'venda_total' | 'atendimentos' | 'pecas' = 'venda_total',
  meses = 6,
  antesDe?: { ano: number; mes: number }
): number {
  const chave = (ano: number, mes: number) => ano * 12 + (mes - 1)
  const mapa = new Map<number, number>()
  for (const h of historico) mapa.set(chave(h.ano, h.mes), Number(h[campo] ?? 0))
  const limite = antesDe ? chave(antesDe.ano, antesDe.mes) : Infinity
  const candidatos = [...mapa.keys()]
    .filter((k) => k < limite && (mapa.get(k) ?? 0) > 0 && (mapa.get(k - 12) ?? 0) > 0)
    .sort((a, b) => b - a)
    .slice(0, meses)
  if (candidatos.length === 0) return 1
  const atual = candidatos.reduce((acc, k) => acc + (mapa.get(k) ?? 0), 0)
  const anterior = candidatos.reduce((acc, k) => acc + (mapa.get(k - 12) ?? 0), 0)
  return anterior > 0 ? atual / anterior : 1
}

/**
 * Sugestão por tendência: pega o valor do mesmo mês no ano anterior e
 * aplica o crescimento recente da loja (últimos 3 meses vs. os mesmos meses
 * do ano anterior) para essa métrica.
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
  const crescimento = calcularCrescimentoRecente(historico, campo, 3)
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
