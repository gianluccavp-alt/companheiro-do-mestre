export interface RollResult {
  expr: string
  total: number
  detail: string
  rolls: number[]
}

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1
}

// Suporta expressões como: d20, 4d6, 2d8+3, 1d20-1, d%, 3d6+2d4+1
export function rollExpression(input: string): RollResult | null {
  const expr = input.trim().toLowerCase().replace(/\s+/g, '')
  if (!expr) return null
  // normaliza d% como d100
  const normalized = expr.replace(/d%/g, 'd100')
  // valida caracteres
  if (!/^[-+]?(\d*d\d+|\d+)([-+](\d*d\d+|\d+))*$/.test(normalized)) return null

  const terms = normalized.match(/[-+]?[^-+]+/g)
  if (!terms) return null

  let total = 0
  const allRolls: number[] = []
  const parts: string[] = []

  for (const term of terms) {
    const sign = term.startsWith('-') ? -1 : 1
    const body = term.replace(/^[-+]/, '')
    if (body.includes('d')) {
      const [countStr, sidesStr] = body.split('d')
      const count = countStr === '' ? 1 : parseInt(countStr)
      const sides = parseInt(sidesStr)
      if (!count || !sides || count > 100 || sides > 1000) return null
      const rolls: number[] = []
      for (let i = 0; i < count; i++) {
        const r = rollDie(sides)
        rolls.push(r)
        allRolls.push(r)
        total += sign * r
      }
      parts.push((sign < 0 ? '-' : '') + body + ' [' + rolls.join(', ') + ']')
    } else {
      const n = parseInt(body)
      total += sign * n
      parts.push((sign < 0 ? '-' : '+') + n)
    }
  }

  return { expr: input.trim(), total, detail: parts.join(' '), rolls: allRolls }
}

// Rola 1d20 + modificador (para iniciativa)
export function rollInitiative(bonus: number): number {
  return rollDie(20) + (bonus || 0)
}
