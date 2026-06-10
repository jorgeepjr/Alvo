import { describe, it, expect } from 'vitest'
import { calcularProjecao, calcularTicketMedio, distribuirCotaPorPeso, calcularSugestaoMeta } from './calculos'

describe('calcularProjecao', () => {
  it('projeta o valor final do mês com base no ritmo atual', () => {
    expect(calcularProjecao(1000, 5, 22)).toBeCloseTo(4400, 2)
  })

  it('retorna 0 se nenhum dia foi trabalhado', () => {
    expect(calcularProjecao(0, 0, 22)).toBe(0)
  })
})

describe('calcularTicketMedio', () => {
  it('calcula valor dividido por quantidade', () => {
    expect(calcularTicketMedio(500, 25)).toBe(20)
  })

  it('retorna 0 se quantidade for 0', () => {
    expect(calcularTicketMedio(500, 0)).toBe(0)
  })
})

describe('distribuirCotaPorPeso', () => {
  it('distribui a meta mensal proporcionalmente aos pesos de cada dia', () => {
    const dias = [
      { data: '2026-07-06', peso: 1 },
      { data: '2026-07-11', peso: 2 },
    ]
    const resultado = distribuirCotaPorPeso(dias, 300)
    expect(resultado[0].cota).toBeCloseTo(100, 2)
    expect(resultado[1].cota).toBeCloseTo(200, 2)
  })

  it('zera a cota de dias com peso 0 (feriado/fechado)', () => {
    const dias = [
      { data: '2026-07-06', peso: 1 },
      { data: '2026-07-07', peso: 0 },
    ]
    const resultado = distribuirCotaPorPeso(dias, 100)
    expect(resultado[1].cota).toBe(0)
    expect(resultado[0].cota).toBeCloseTo(100, 2)
  })
})

describe('calcularSugestaoMeta', () => {
  it('calcula conservadora, moderada e agressiva a partir do histórico de 3 anos', () => {
    const historico = [100, 120, 110]
    const sugestao = calcularSugestaoMeta(historico)
    expect(sugestao.conservadora).toBeCloseTo(110, 2)
    expect(sugestao.moderada).toBeCloseTo(132, 2)
    expect(sugestao.agressiva).toBeCloseTo(138, 2)
  })
})
