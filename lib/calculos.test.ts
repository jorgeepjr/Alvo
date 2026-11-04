import { describe, it, expect } from 'vitest'
import { calcularProjecao, calcularTicketMedio, distribuirCotaPorPeso, distribuirCotaInteira, calcularSugestaoMeta, distribuirCotaRedonda, calcularCrescimentoRecente } from './calculos'

describe('distribuirCotaInteira', () => {
  it('soma exatamente igual ao total (sem perder por arredondamento)', () => {
    const dias = Array.from({ length: 30 }, (_, i) => ({ data: `2026-06-${String(i + 1).padStart(2, '0')}`, peso: [1.4, 0.7, 0.8, 0.8, 0.9, 1.1, 1.4][i % 7] }))
    const cotas = distribuirCotaInteira(dias, 50000)
    const soma = cotas.reduce((acc, c) => acc + c.cota, 0)
    expect(soma).toBe(50000)
    expect(cotas.every((c) => Number.isInteger(c.cota))).toBe(true)
  })

  it('dias com peso 0 recebem cota 0', () => {
    const cotas = distribuirCotaInteira([{ data: 'a', peso: 0 }, { data: 'b', peso: 1 }], 100)
    expect(cotas[0].cota).toBe(0)
    expect(cotas[1].cota).toBe(100)
  })
})

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

describe('distribuirCotaRedonda', () => {
  const dias = [
    { data: '2026-11-01', peso: 1 },
    { data: '2026-11-02', peso: 1 },
    { data: '2026-11-03', peso: 0 },
    { data: '2026-11-04', peso: 1 },
  ]
  it('soma exatamente o total, com valores redondos e só o último dia "quebrado"', () => {
    const r = distribuirCotaRedonda(dias, 1000)
    expect(r.reduce((a, b) => a + b.cota, 0)).toBe(1000)
    expect(r[0].cota % 100).toBe(0)
    expect(r[1].cota % 100).toBe(0)
    expect(r[2].cota).toBe(0)
    expect(r[3].cota).toBe(1000 - r[0].cota - r[1].cota)
  })
  it('total zero ou negativo zera tudo', () => {
    expect(distribuirCotaRedonda(dias, -50).every((d) => d.cota === 0)).toBe(true)
  })
  it('nunca deixa o último dia negativo', () => {
    const r = distribuirCotaRedonda([{ data: 'a', peso: 1 }, { data: 'b', peso: 1 }, { data: 'c', peso: 1 }], 160)
    expect(r.reduce((a, b) => a + b.cota, 0)).toBe(160)
    expect(r.every((d) => d.cota >= 0)).toBe(true)
  })
})

describe('calcularCrescimentoRecente', () => {
  const hist = [
    { ano: 2025, mes: 1, venda_total: 100 },
    { ano: 2025, mes: 2, venda_total: 100 },
    { ano: 2025, mes: 3, venda_total: 100 },
    { ano: 2026, mes: 1, venda_total: 300 }, // pico antigo (+200%)
    { ano: 2026, mes: 2, venda_total: 110 },
    { ano: 2026, mes: 3, venda_total: 110 },
  ]
  it('usa só os últimos N meses (soma vs. soma do ano anterior)', () => {
    expect(calcularCrescimentoRecente(hist, 'venda_total', 2)).toBeCloseTo(1.1)
  })
  it('respeita o limite "antes de"', () => {
    expect(calcularCrescimentoRecente(hist, 'venda_total', 2, { ano: 2026, mes: 3 })).toBeCloseTo((300 + 110) / 200)
  })
  it('sem base do ano anterior retorna 1', () => {
    expect(calcularCrescimentoRecente([{ ano: 2026, mes: 1, venda_total: 10 }])).toBe(1)
  })
})
