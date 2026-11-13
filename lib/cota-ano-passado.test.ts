import { describe, it, expect } from 'vitest'
import { pesosAnoPassado } from './cota-ano-passado'
import { datasDoMes, diaSemana } from './datas'

const nov26 = datasDoMes('2026-11').map((data) => ({ data, situacao: diaSemana(data) === 0 ? 'fechado' : 'normal' }))
const ly: Record<string, number> = {}
for (const d of datasDoMes('2025-11')) ly[d] = diaSemana(d) === 0 ? 0 : 1000
ly['2025-11-28'] = 9000 // Black 2025

describe('pesosAnoPassado', () => {
  it('Black de 2025 (28/11) cai na Black de 2026 (27/11)', () => {
    const W = pesosAnoPassado(nov26, ly)
    expect(W['2026-11-27']).toBe(9000)
  })
  it('domingo fechado tem peso 0', () => {
    expect(pesosAnoPassado(nov26, ly)['2026-11-01']).toBe(0)
  })
  it('a sobra (dia do ano passado sem par) vai pro último dia útil', () => {
    const W = pesosAnoPassado(nov26, ly)
    // 30/11/2026 (segunda) ← 01/12/2025 está fora do mês: fica com a média das segundas + a sobra (01/11/2025)
    expect(W['2026-11-30']).toBe(2000)
  })
  it('sem histórico usa o peso do dia da semana', () => {
    const W = pesosAnoPassado(nov26, {})
    expect(W['2026-11-07']).toBe(1.4) // sábado
  })
})
