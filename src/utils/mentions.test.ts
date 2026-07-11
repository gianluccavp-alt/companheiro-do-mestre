import { describe, it, expect } from 'vitest'
import { parseMentions } from './mentions'

describe('parseMentions', () => {
  const names = ['Aldric', 'Capitão Blacktide']

  it('retorna texto único quando não há nomes', () => {
    expect(parseMentions('olá @Aldric', [])).toEqual([{ type: 'text', value: 'olá @Aldric' }])
  })

  it('detecta uma menção simples', () => {
    const t = parseMentions('e então @Aldric agiu', names)
    expect(t).toEqual([
      { type: 'text', value: 'e então ' },
      { type: 'mention', value: 'Aldric' },
      { type: 'text', value: ' agiu' }
    ])
  })

  it('prefere o nome mais longo (com espaço)', () => {
    const t = parseMentions('@Capitão Blacktide entrou', names)
    expect(t[0]).toEqual({ type: 'mention', value: 'Capitão Blacktide' })
  })

  it('ignora @ de nomes desconhecidos', () => {
    const t = parseMentions('@Ninguem aqui', names)
    expect(t).toEqual([{ type: 'text', value: '@Ninguem aqui' }])
  })
})
