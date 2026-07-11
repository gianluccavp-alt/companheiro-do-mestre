// Busca de magias na API v2 do Open5e. Docs: https://open5e.com/api-docs
const API = 'https://api.open5e.com/v2/spells/'
const DOCS_API = 'https://api.open5e.com/v2/documents/'

export interface SourceDoc {
  key: string
  name: string
  gamesystemKey: string
  gamesystemName: string
}

interface Open5eDocument {
  key: string
  display_name?: string
  name?: string
  gamesystem?: { key?: string; name?: string } | null
}

// Lista os documentos/fontes disponíveis (SRD, Tome of Beasts, Kobold Press, ...).
export async function fetchSources(): Promise<SourceDoc[]> {
  const res = await fetch(`${DOCS_API}?limit=100`)
  if (!res.ok) throw new Error('Falha ao consultar as fontes (HTTP ' + res.status + ')')
  const data = (await res.json()) as { results?: Open5eDocument[] }
  return (data.results || [])
    .map((d) => ({
      key: d.key,
      name: d.display_name || d.name || d.key,
      gamesystemKey: d.gamesystem?.key || '',
      gamesystemName: d.gamesystem?.name || 'Outros'
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export interface Spell {
  key: string
  name: string
  level: number
  levelLabel: string
  school: string
  desc: string
  higherLevel: string | null
  range: string
  castingTime: string
  duration: string
  concentration: boolean
  ritual: boolean
  components: string
  classes: string[]
  save: string | null
  damageTypes: string[]
  sourceName: string
  edition: string
  editionKey: string
}

interface Open5eNamed {
  name?: string
}
interface Open5eSpell {
  key: string
  name: string
  document?: {
    key?: string
    display_name?: string
    name?: string
    gamesystem?: { key?: string; name?: string } | null
  } | null
  level?: number | null
  school?: Open5eNamed | null
  desc?: string
  higher_level?: string | null
  range_text?: string | null
  casting_time?: string | null
  duration?: string | null
  concentration?: boolean
  ritual?: boolean
  verbal?: boolean
  somatic?: boolean
  material?: boolean
  material_specified?: string | null
  classes?: Open5eNamed[]
  saving_throw_ability?: string | null
  damage_types?: string[]
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

// Rótulo curto da edição/sistema (2014, 2024, A5E...).
function shortGamesystem(key?: string, name?: string): string {
  if (key === '5e-2014') return '2014'
  if (key === '5e-2024') return '2024'
  if (key === 'a5e') return 'A5E'
  return name || key || ''
}

function levelLabel(level: number): string {
  return level === 0 ? 'Truque' : `Nível ${level}`
}

function componentsString(s: Open5eSpell): string {
  const parts: string[] = []
  if (s.verbal) parts.push('V')
  if (s.somatic) parts.push('S')
  if (s.material) parts.push('M' + (s.material_specified ? ` (${s.material_specified})` : ''))
  return parts.join(', ')
}

function mapSpell(s: Open5eSpell): Spell {
  const level = s.level ?? 0
  return {
    key: s.key,
    name: s.name,
    level,
    levelLabel: levelLabel(level),
    school: s.school?.name || '',
    desc: s.desc || '',
    higherLevel: s.higher_level || null,
    range: s.range_text || '—',
    castingTime: s.casting_time ? capitalize(s.casting_time) : '—',
    duration: s.duration || '—',
    concentration: !!s.concentration,
    ritual: !!s.ritual,
    components: componentsString(s),
    classes: (s.classes || []).map((c) => c.name || '').filter(Boolean),
    save: s.saving_throw_ability ? capitalize(s.saving_throw_ability) : null,
    damageTypes: s.damage_types || [],
    sourceName: s.document?.display_name || s.document?.name || 'Fonte desconhecida',
    edition: shortGamesystem(s.document?.gamesystem?.key, s.document?.gamesystem?.name),
    editionKey: s.document?.gamesystem?.key || ''
  }
}

// filter: fragmento "chave=valor" (ex.: "document__key=srd-2014") ou '' para todas as fontes.
export async function searchSpells(query: string, filter: string): Promise<Spell[]> {
  const q = query.trim()
  const parts = ['limit=50', 'ordering=name']
  if (filter) parts.push(filter)
  if (q) parts.push('name__icontains=' + encodeURIComponent(q))
  const res = await fetch(`${API}?${parts.join('&')}`)
  if (!res.ok) throw new Error('Falha ao consultar o Open5e (HTTP ' + res.status + ')')
  const data = (await res.json()) as { results?: Open5eSpell[] }
  return (data.results || []).map(mapSpell)
}
