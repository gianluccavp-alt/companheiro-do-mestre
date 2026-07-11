export function hl(text: string, search: string): string {
  if (!search) return text
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp('(' + escaped + ')', 'gi'), '<mark class="hl">$1</mark>')
}
