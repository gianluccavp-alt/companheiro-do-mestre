import type { StatEntry } from '../types'

// Normaliza traços/ações para lista estruturada, aceitando também o formato
// antigo (uma string única com blocos separados por linha em branco).
export function toEntries(value: StatEntry[] | string | null | undefined): StatEntry[] {
  if (Array.isArray(value)) {
    return value
      .filter((e) => e && (e.name || e.desc))
      .map((e) => ({ name: e.name || '', desc: e.desc || '' }))
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => {
        const idx = block.indexOf('. ')
        // Trata o texto antes do primeiro ponto como nome, se for curto o bastante.
        if (idx > 0 && idx <= 60) return { name: block.slice(0, idx), desc: block.slice(idx + 2) }
        return { name: '', desc: block }
      })
  }
  return []
}

export function hasEntries(value: StatEntry[] | string | null | undefined): boolean {
  return toEntries(value).length > 0
}
