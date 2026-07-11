import { describe, it, expect } from 'vitest'
import { effectiveDamage, hpPercent, hpStatus } from './combat'

describe('effectiveDamage', () => {
  it('mantém o dano sem tipo informado', () => {
    expect(effectiveDamage({}, 10, '')).toBe(10)
  })
  it('zera dano com imunidade', () => {
    expect(effectiveDamage({ immune: ['Fire'] }, 10, 'Fire')).toBe(0)
  })
  it('reduz pela metade com resistência (arredonda para baixo)', () => {
    expect(effectiveDamage({ resist: ['Cold'] }, 9, 'Cold')).toBe(4)
  })
  it('dobra com vulnerabilidade', () => {
    expect(effectiveDamage({ vuln: ['Acid'] }, 7, 'Acid')).toBe(14)
  })
  it('imunidade tem prioridade sobre vulnerabilidade', () => {
    expect(effectiveDamage({ immune: ['Fire'], vuln: ['Fire'] }, 10, 'Fire')).toBe(0)
  })
})

describe('hpPercent', () => {
  it('calcula porcentagem', () => {
    expect(hpPercent(5, 10)).toBe(50)
  })
  it('limita a 100 com HP acima do máximo', () => {
    expect(hpPercent(15, 10)).toBe(100)
  })
  it('não fica negativo', () => {
    expect(hpPercent(-3, 10)).toBe(0)
  })
})

describe('hpStatus', () => {
  it('reporta fora de combate quando morto', () => {
    expect(hpStatus(10, 10, true)).toBe('Fora de combate')
  })
  it('classifica faixas de saúde', () => {
    expect(hpStatus(10, 10, false)).toBe('Saudável')
    expect(hpStatus(6, 10, false)).toBe('Ferido')
    expect(hpStatus(3, 10, false)).toBe('Machucado')
    expect(hpStatus(1, 10, false)).toBe('Estado grave')
  })
})
