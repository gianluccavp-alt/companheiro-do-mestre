import type { Ficha, StatEntry } from '../types'

// API v2 do Open5e (a v1 foi descontinuada). Docs: https://open5e.com/api-docs
const API = 'https://api.open5e.com/v2/creatures/'

interface Open5eAction {
  name: string
  desc: string
  action_type?: string
  legendary_action_cost?: number | null
}
interface Open5eNamed {
  name?: string
  key?: string
}
interface Open5eMonster {
  name: string
  size?: Open5eNamed | null
  type?: Open5eNamed | null
  alignment?: string | null
  armor_class?: number | null
  hit_points?: number | null
  challenge_rating?: number | null
  initiative_bonus?: number | null
  speed?: Record<string, number | string | boolean> | null
  ability_scores?: {
    strength?: number
    dexterity?: number
    constitution?: number
    intelligence?: number
    wisdom?: number
    charisma?: number
  } | null
  modifiers?: { dexterity?: number } | null
  actions?: Open5eAction[]
  traits?: Open5eAction[]
  document?: {
    key?: string
    display_name?: string
    name?: string
    gamesystem?: { key?: string; name?: string } | null
  } | null
}

function formatCR(cr: number | null | undefined): string | null {
  if (cr == null) return null
  const map: Record<string, string> = { '0.125': '1/8', '0.25': '1/4', '0.5': '1/2' }
  return map[String(cr)] || String(cr)
}

function speedToString(speed?: Record<string, number | string | boolean> | null): string | null {
  if (!speed) return null
  const parts: string[] = []
  for (const [k, v] of Object.entries(speed)) {
    if (k === 'unit') continue
    if (typeof v === 'number' && v > 0) parts.push(`${k} ${v} ft.`)
  }
  return parts.length ? parts.join(', ') : null
}

function actionTypeLabel(t?: string): string {
  switch (t) {
    case 'BONUS_ACTION':
      return ' (Ação Bônus)'
    case 'REACTION':
      return ' (Reação)'
    case 'LEGENDARY':
      return ' (Lendária)'
    default:
      return ''
  }
}
function actionsToEntries(list?: Open5eAction[]): StatEntry[] {
  if (!list || !list.length) return []
  return list.map((a) => ({ name: `${a.name}${actionTypeLabel(a.action_type)}`, desc: a.desc }))
}
function traitsToEntries(list?: Open5eAction[]): StatEntry[] {
  if (!list || !list.length) return []
  return list.map((t) => ({ name: t.name, desc: t.desc }))
}

// Rótulo curto da edição/sistema (2014, 2024, A5E...).
function shortGamesystem(key?: string, name?: string): string {
  if (key === '5e-2014') return '2014'
  if (key === '5e-2024') return '2024'
  if (key === 'a5e') return 'A5E'
  return name || key || ''
}

function mapMonster(m: Open5eMonster): ImportedFicha {
  const ab = m.ability_scores || {}
  const initBonus = m.initiative_bonus != null ? m.initiative_bonus : m.modifiers?.dexterity ?? null
  const typeLabel = [m.size?.name, m.type?.name].filter(Boolean).join(' ') || m.type?.name || null
  return {
    name: m.name,
    hpMax: m.hit_points ?? null,
    ac: m.armor_class ?? null,
    initBonus,
    type: typeLabel,
    size: m.size?.name ?? null,
    alignment: m.alignment ?? null,
    cr: formatCR(m.challenge_rating),
    speed: speedToString(m.speed),
    str: ab.strength ?? null,
    dex: ab.dexterity ?? null,
    con: ab.constitution ?? null,
    int: ab.intelligence ?? null,
    wis: ab.wisdom ?? null,
    cha: ab.charisma ?? null,
    traits: traitsToEntries(m.traits),
    actions: actionsToEntries(m.actions)
  }
}

export type ImportedFicha = Omit<Ficha, 'id' | 'img'>

export interface MonsterCandidate {
  key: string
  name: string
  sourceName: string
  edition: string
  editionKey: string
  cr: string | null
  type: string | null
  ficha: ImportedFicha
}

// Ordena por relevância ao termo buscado (exato > começa com > contém), depois por nome.
function relevanceRank(name: string, q: string): number {
  const n = name.toLowerCase()
  if (n === q) return 0
  if (n.startsWith(q)) return 1
  if (n.includes(q)) return 2
  return 3
}

export async function searchMonsters(name: string): Promise<MonsterCandidate[]> {
  const q = name.trim()
  const url = `${API}?name__icontains=${encodeURIComponent(q)}&limit=50`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Falha ao consultar o Open5e (HTTP ' + res.status + ')')
  const data = (await res.json()) as { results?: Open5eMonster[] }
  const results = data.results || []
  const ql = q.toLowerCase()
  return results
    .map((m) => ({
      key: (m as { key?: string }).key || m.name,
      name: m.name,
      sourceName: m.document?.display_name || m.document?.name || 'Fonte desconhecida',
      edition: shortGamesystem(m.document?.gamesystem?.key, m.document?.gamesystem?.name),
      editionKey: m.document?.gamesystem?.key || '',
      cr: formatCR(m.challenge_rating),
      type: [m.size?.name, m.type?.name].filter(Boolean).join(' ') || m.type?.name || null,
      ficha: mapMonster(m)
    }))
    .sort((a, b) => relevanceRank(a.name, ql) - relevanceRank(b.name, ql) || a.name.localeCompare(b.name))
}
