import type { Reference } from '../types'

export const REF_NO_CAT = 'Sem categoria'

export interface RefSubGroup {
  child: string
  items: Reference[]
}
export interface RefGroup {
  parent: string
  children: RefSubGroup[]
}

// Agrupa referências em pastas (catParent) e subcategorias (catChild),
// respeitando a ordem manual das pastas (catOrder) e das subcategorias
// (subOrder, por pasta). Categorias sem ordem definida caem para o fim,
// em ordem alfabética, com "Sem categoria" sempre por último.
export function groupReferences(
  refs: Reference[],
  catOrder: string[] = [],
  subOrder: Record<string, string[]> = {}
): RefGroup[] {
  const parents = new Map<string, Map<string, Reference[]>>()
  for (const r of refs) {
    const p = r.catParent?.trim() || REF_NO_CAT
    const c = r.catChild?.trim() || ''
    if (!parents.has(p)) parents.set(p, new Map())
    const children = parents.get(p)!
    if (!children.has(c)) children.set(c, [])
    children.get(c)!.push(r)
  }

  const rank = (order: string[], name: string, noCatLast: boolean) => {
    const i = order.indexOf(name)
    if (i >= 0) return i
    if (noCatLast && name === REF_NO_CAT) return 1e9
    return 1e6
  }
  const parentCmp = (a: string, b: string) => {
    const ra = rank(catOrder, a, true)
    const rb = rank(catOrder, b, true)
    if (ra !== rb) return ra - rb
    if (a === REF_NO_CAT) return 1
    if (b === REF_NO_CAT) return -1
    return a.localeCompare(b)
  }
  const childCmp = (parent: string) => (a: string, b: string) => {
    const order = subOrder[parent] || []
    const ra = rank(order, a, false)
    const rb = rank(order, b, false)
    if (ra !== rb) return ra - rb
    return a.localeCompare(b)
  }

  return [...parents.keys()].sort(parentCmp).map((p) => ({
    parent: p,
    children: [...parents.get(p)!.keys()].sort(childCmp(p)).map((c) => ({ child: c, items: parents.get(p)!.get(c)! }))
  }))
}
