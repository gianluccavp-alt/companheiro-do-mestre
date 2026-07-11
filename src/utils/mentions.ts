export type Token = { type: 'text'; value: string } | { type: 'mention'; value: string }

function esc(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Divide o texto em trechos normais e menções (@Nome) que correspondem a nomes conhecidos.
export function parseMentions(body: string, names: string[]): Token[] {
  const valid = names.filter(Boolean)
  if (!valid.length) return [{ type: 'text', value: body }]
  const sorted = [...new Set(valid)].sort((a, b) => b.length - a.length).map(esc)
  const re = new RegExp('@(' + sorted.join('|') + ')', 'g')
  const tokens: Token[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(body))) {
    if (m.index > last) tokens.push({ type: 'text', value: body.slice(last, m.index) })
    tokens.push({ type: 'mention', value: m[1] })
    last = re.lastIndex
  }
  if (last < body.length) tokens.push({ type: 'text', value: body.slice(last) })
  return tokens.length ? tokens : [{ type: 'text', value: body }]
}
