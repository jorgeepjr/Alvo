// Converte um valor digitado em formato brasileiro (vírgula decimal, ponto de
// milhar) ou americano para número. Aceita "150,00", "1.500,50", "150.50", "150".
export function parseValorBR(raw: FormDataEntryValue | null | undefined): number {
  const s = String(raw ?? '').trim()
  if (!s) return 0
  // Tem vírgula → vírgula é decimal e pontos são milhar.
  if (s.includes(',')) {
    const n = Number(s.replace(/\./g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}
