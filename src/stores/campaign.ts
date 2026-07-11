import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Campaign, PersistedData } from '../types'
import { idbGet, idbSet } from '../composables/useIdbStorage'

const KEY = 'nc_data'

function newCampaign(name: string): Campaign {
  return {
    id: 'c' + Date.now(),
    name,
    diary: [],
    fichas: [],
    party: [],
    creatures: [],
    personagens: [],
    itens: [],
    currentTurn: -1,
    round: 0,
    combatLog: [],
    references: []
  }
}

export const useCampaignStore = defineStore('campaign', () => {
  const campaigns = ref<Campaign[]>([])
  const activeId = ref<string | null>(null)
  const storageStatus = ref('')

  // Equivalente à função AC() do app original.
  const activeCampaign = computed<Campaign>(() => {
    const c = campaigns.value.find((x) => x.id === activeId.value)
    if (!c && campaigns.value.length) {
      activeId.value = campaigns.value[0].id
      return campaigns.value[0]
    }
    return c as Campaign
  })

  function persist() {
    const data = JSON.stringify({ campaigns: campaigns.value, activeId: activeId.value })
    idbSet(KEY, data).catch(() => {})
    try {
      localStorage.setItem(KEY, data)
    } catch {
      /* ignore */
    }
  }

  async function loadStorage() {
    try {
      const raw = await idbGet<string>(KEY)
      if (raw) {
        const d = JSON.parse(raw) as PersistedData
        if (d.campaigns && d.campaigns.length) {
          campaigns.value = d.campaigns
          activeId.value = d.activeId
          return
        }
      }
    } catch {
      /* ignore */
    }
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const d = JSON.parse(raw) as PersistedData
        if (d.campaigns && d.campaigns.length) {
          campaigns.value = d.campaigns
          activeId.value = d.activeId
        }
      }
    } catch {
      /* ignore */
    }
  }

  function ensureDefaults() {
    if (!campaigns.value.length) {
      const c = newCampaign('Campanha Principal')
      campaigns.value = [c]
      activeId.value = c.id
    }
    if (!activeId.value || !campaigns.value.find((c) => c.id === activeId.value)) {
      activeId.value = campaigns.value[0].id
    }
    campaigns.value.forEach((c) => {
      if (!c.diary) c.diary = []
      if (!c.fichas) c.fichas = []
      if (!c.party) c.party = []
      if (!c.creatures) c.creatures = []
      if (!c.personagens) c.personagens = []
      if (!c.itens) c.itens = []
      if (c.currentTurn === undefined) c.currentTurn = -1
      if (c.round === undefined) c.round = 0
      if (!c.combatLog) c.combatLog = []
      if (!c.references) c.references = []
    })
  }

  async function init() {
    await loadStorage()
    ensureDefaults()
    try {
      await idbSet('_test', 'ok')
      storageStatus.value = '💾 Salvando em IndexedDB (persistente)'
    } catch {
      try {
        localStorage.setItem('_test', '1')
        localStorage.removeItem('_test')
        storageStatus.value = '💾 Salvando em localStorage'
      } catch {
        storageStatus.value = '⚠ Sem armazenamento disponível'
      }
    }
    // Persistência automática: substitui as chamadas manuais de persist() do app original.
    watch([campaigns, activeId], () => persist(), { deep: true })
  }

  function switchCamp(id: string) {
    activeId.value = id
    persist()
  }

  function createCamp(name: string) {
    const n = name.trim()
    if (!n) return false
    const c = newCampaign(n)
    campaigns.value.push(c)
    activeId.value = c.id
    persist()
    return true
  }

  function renameCamp(name: string) {
    const n = name.trim()
    if (!n) return
    activeCampaign.value.name = n
    persist()
  }

  function deleteCamp() {
    if (campaigns.value.length <= 1) return false
    campaigns.value = campaigns.value.filter((c) => c.id !== activeId.value)
    activeId.value = campaigns.value[0].id
    persist()
    return true
  }

  function serialize() {
    return JSON.stringify({ campaigns: campaigns.value, activeId: activeId.value })
  }

  function exportData() {
    const a = document.createElement('a')
    a.href =
      'data:application/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify({ campaigns: campaigns.value, activeId: activeId.value }, null, 2))
    a.download = 'companheiro_backup.json'
    a.click()
  }

  function importData(d: PersistedData) {
    if (d.campaigns) {
      campaigns.value = d.campaigns
      activeId.value = d.activeId || d.campaigns[0].id
    }
    ensureDefaults()
    persist()
  }

  return {
    campaigns,
    activeId,
    storageStatus,
    activeCampaign,
    persist,
    init,
    switchCamp,
    createCamp,
    renameCamp,
    deleteCamp,
    serialize,
    exportData,
    importData
  }
})
