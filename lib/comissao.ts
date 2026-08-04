export type ConfigComissao = { pctComMeta: number; pctSemMeta: number }

export type ResultadoComissao = {
  bateu: boolean
  percentual: number
  comissao: number
  faltaParaMeta: number
}

export function calcularComissao(
  vendido: number,
  meta: number,
  config: ConfigComissao,
): ResultadoComissao {
  const bateu = meta > 0 && vendido >= meta
  const percentual = bateu ? config.pctComMeta : config.pctSemMeta
  const comissao = Math.round(vendido * percentual) / 100
  const faltaParaMeta = bateu || meta <= 0 ? 0 : Math.max(meta - vendido, 0)
  return { bateu, percentual, comissao, faltaParaMeta }
}
