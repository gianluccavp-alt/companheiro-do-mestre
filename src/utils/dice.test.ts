import { describe, it, expect, vi, afterEach } from 'vitest'
import { rollExpression, rollInitiative } from './dice'

afterEach(() => vi.restoreAllMocks())

describe('rollExpression', () => {
  it('rola um único dado dentro do intervalo', () => {
    for (let i = 0; i < 50; i++) {
      const r = rollExpression('d20')!
      expect(r.total).toBeGreaterThanOrEqual(1)
      expect(r.total).toBeLessThanOrEqual(20)
      expect(r.rolls).toHaveLength(1)
    }
  })

  it('interpreta d% como d100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const r = rollExpression('d%')!
    expect(r.total).toBe(51)
  })

  it('soma modificadores fixos', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // cada dado = 1
    const r = rollExpression('2d6+3')!
    expect(r.total).toBe(1 + 1 + 3)
    expect(r.rolls).toEqual([1, 1])
  })

  it('subtrai modificadores negativos', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const r = rollExpression('1d20-1')!
    expect(r.total).toBe(0)
  })

  it('combina múltiplos grupos de dados', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const r = rollExpression('3d6+2d4+1')!
    expect(r.total).toBe(3 * 1 + 2 * 1 + 1)
  })

  it('retorna null para expressões inválidas', () => {
    expect(rollExpression('abc')).toBeNull()
    expect(rollExpression('')).toBeNull()
    expect(rollExpression('2x6')).toBeNull()
  })
})

describe('rollInitiative', () => {
  it('soma o bônus ao d20', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // d20 = 1
    expect(rollInitiative(5)).toBe(6)
  })
})
