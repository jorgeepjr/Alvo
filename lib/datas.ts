// Datas no fuso da loja (Ipatinga = America/Sao_Paulo). Nunca usar
// toISOString() pra "hoje": depois das 21h ele já devolve o dia seguinte.

export const MESES_NOME = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
export const MESES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/** "YYYY-MM-DD" de hoje no horário de Brasília. */
export function hojeBR(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora)
}

/** "HH:MM" de agora no horário de Brasília. */
export function horaBR(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false }).format(agora)
}

/** "YYYY-MM" de uma data "YYYY-MM-DD". */
export const ymDe = (data: string) => data.slice(0, 7)

export function validaYm(ym: string | undefined | null): string | null {
  return ym && /^\d{4}-(0[1-9]|1[0-2])$/.test(ym) ? ym : null
}

/** Soma k meses a "YYYY-MM". */
export function addMes(ym: string, k: number): string {
  let y = Number(ym.slice(0, 4))
  let m = Number(ym.slice(5, 7)) - 1 + k
  y += Math.floor(m / 12)
  m = ((m % 12) + 12) % 12
  return `${y}-${String(m + 1).padStart(2, '0')}`
}

export const anoDe = (ym: string) => Number(ym.slice(0, 4))
export const mesDe = (ym: string) => Number(ym.slice(5, 7))
export const diasNoMes = (ym: string) => new Date(anoDe(ym), mesDe(ym), 0).getDate()
export const inicioDoMes = (ym: string) => `${ym}-01`
export const fimDoMes = (ym: string) => `${ym}-${String(diasNoMes(ym)).padStart(2, '0')}`

/** "Novembro/2026" */
export const nomeMes = (ym: string) => `${MESES_NOME[mesDe(ym) - 1]}/${anoDe(ym)}`
/** "nov/26" */
export const nomeMesCurto = (ym: string) => `${MESES_CURTO[mesDe(ym) - 1]}/${String(anoDe(ym)).slice(2)}`
/** "12/11" */
export const ddmm = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)}`

/** 0 = domingo … 6 = sábado */
export const diaSemana = (data: string) => new Date(`${data}T12:00:00Z`).getUTCDay()

/** Lista "YYYY-MM-DD" de todos os dias do mês. */
export function datasDoMes(ym: string): string[] {
  return Array.from({ length: diasNoMes(ym) }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`)
}

/** Soma n dias a "YYYY-MM-DD" (n pode ser negativo). */
export function addDias(data: string, n: number): string {
  const t = new Date(`${data}T12:00:00Z`)
  t.setUTCDate(t.getUTCDate() + n)
  return t.toISOString().slice(0, 10)
}

/** O mesmo dia da semana no ano passado: 364 dias antes (alinha a Black Friday). */
export const mesmoDiaAnoPassado = (data: string) => addDias(data, -364)
