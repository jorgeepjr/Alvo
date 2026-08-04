import { describe, it, expect } from 'vitest'
import { calcularComissao } from './comissao'

const cfg = { pctComMeta: 2, pctSemMeta: 1 }

describe('calcularComissao', () => {
  it('acima da meta aplica a % de meta batida (2%)', () => {
    const r = calcularComissao(39716.40, 30000, cfg)
    expect(r.bateu).toBe(true)
    expect(r.percentual).toBe(2)
    expect(r.comissao).toBe(794.33)
    expect(r.faltaParaMeta).toBe(0)
  })

  it('abaixo da meta aplica a % sem meta (1%) e informa quanto falta', () => {
    const r = calcularComissao(20000, 30000, cfg)
    expect(r.bateu).toBe(false)
    expect(r.percentual).toBe(1)
    expect(r.comissao).toBe(200)
    expect(r.faltaParaMeta).toBe(10000)
  })

  it('vendido exatamente igual à meta conta como bateu', () => {
    const r = calcularComissao(30000, 30000, cfg)
    expect(r.bateu).toBe(true)
    expect(r.percentual).toBe(2)
    expect(r.comissao).toBe(600)
  })

  it('meta zero (sem meta cadastrada) usa a % sem meta e não marca bateu', () => {
    const r = calcularComissao(5000, 0, cfg)
    expect(r.bateu).toBe(false)
    expect(r.percentual).toBe(1)
    expect(r.comissao).toBe(50)
    expect(r.faltaParaMeta).toBe(0)
  })

  it('respeita percentuais customizados', () => {
    const r = calcularComissao(10000, 8000, { pctComMeta: 3, pctSemMeta: 1.5 })
    expect(r.percentual).toBe(3)
    expect(r.comissao).toBe(300)
  })
})
