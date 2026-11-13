import { describe, it, expect } from 'vitest'
import { infoMes, statusMes, avaliacaoDoDia, diasPendentes } from './projecao'
import { hojeBR, addMes, mesmoDiaAnoPassado, diaSemana } from './datas'

const dias = Array.from({ length: 10 }, (_, i) => ({ data: `2026-11-${String(i + 1).padStart(2, '0')}`, situacao: 'normal', cota: 1000 }))

describe('infoMes', () => {
  it('projeta pela média, pela cota e calcula quanto falta por dia', () => {
    const i = infoMes({
      ym: '2026-11', hoje: '2026-11-05', meta: 10000, dias,
      vendaPorDia: { '2026-11-01': 1500, '2026-11-02': 1500, '2026-11-03': 1500, '2026-11-04': 1500 },
      atendimentos: 20, pecas: 50,
    })
    expect(i.vendido).toBe(6000)
    expect(i.cotaAte).toBe(4000)
    expect(i.pessimista).toBe(15000)
    expect(i.provavel).toBe(15000)
    expect(i.diasRestantes).toBe(6) // 05 a 10
    expect(i.porDia).toBeCloseTo(4000 / 6)
    expect(i.ticket).toBe(300)
    expect(i.pa).toBe(2.5)
  })
  it('dia passado sem lançamento não conta como dia que falta', () => {
    const i = infoMes({ ym: '2026-11', hoje: '2026-11-08', meta: 10000, dias, vendaPorDia: { '2026-11-01': 1000 }, atendimentos: 1, pecas: 1 })
    expect(i.diasRestantes).toBe(3) // 08, 09, 10
  })
  it('projeção pela curva do ano passado', () => {
    const curva = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]
    const i = infoMes({ ym: '2026-11', hoje: '2026-11-03', meta: 10000, dias, vendaPorDia: { '2026-11-01': 500, '2026-11-02': 500 }, atendimentos: 1, pecas: 1, curvaAnoPassado: curva })
    expect(i.pelaCurva).toBe(5000) // 1000 ÷ 20%
  })
  it('mês fechado não tem dias restantes', () => {
    const i = infoMes({ ym: '2026-10', hoje: '2026-11-03', meta: 1000, dias: [], vendaPorDia: { '2026-10-05': 1200 }, atendimentos: 1, pecas: 1 })
    expect(i.fechado).toBe(true)
    expect(i.diasRestantes).toBe(0)
    expect(statusMes(i).tom).toBe('ok')
  })
})

describe('statusMes', () => {
  it('vermelho quando nem a projeção mais alta bate', () => {
    const i = infoMes({ ym: '2026-11', hoje: '2026-11-05', meta: 100000, dias, vendaPorDia: { '2026-11-01': 100 }, atendimentos: 1, pecas: 1 })
    expect(statusMes(i).tom).toBe('bad')
  })
})

describe('avaliacaoDoDia', () => {
  const cfg = { meio: 15, finalIni: 20, finalFim: 25 }
  it('meio do mês do 15 ao 19, reta final do 20 ao 25', () => {
    expect(avaliacaoDoDia(14, cfg)).toBe(0)
    expect(avaliacaoDoDia(15, cfg)).toBe(1)
    expect(avaliacaoDoDia(19, cfg)).toBe(1)
    expect(avaliacaoDoDia(20, cfg)).toBe(2)
    expect(avaliacaoDoDia(25, cfg)).toBe(2)
    expect(avaliacaoDoDia(26, cfg)).toBe(0)
  })
})

describe('diasPendentes', () => {
  it('só dias antes de hoje, por vendedor', () => {
    const p = diasPendentes(['2026-11-10', '2026-11-11', '2026-11-12'], '2026-11-12', [{ id: 'a', nome: 'André' }, { id: 'i', nome: 'Iana' }], new Set(['a|2026-11-10', 'i|2026-11-10', 'i|2026-11-11']))
    expect(p).toEqual([{ vendedorId: 'a', nome: 'André', data: '2026-11-11' }])
  })
})

describe('datas', () => {
  it('hoje no horário de Brasília (23h de Brasília = 02h UTC do dia seguinte)', () => {
    expect(hojeBR(new Date('2026-11-13T02:00:00Z'))).toBe('2026-11-12')
  })
  it('addMes vira o ano', () => {
    expect(addMes('2026-12', 1)).toBe('2027-01')
    expect(addMes('2026-01', -1)).toBe('2025-12')
  })
  it('364 dias antes cai no mesmo dia da semana (Black 27/11/26 → 28/11/25)', () => {
    expect(mesmoDiaAnoPassado('2026-11-27')).toBe('2025-11-28')
    expect(diaSemana('2026-11-27')).toBe(diaSemana('2025-11-28'))
  })
})
