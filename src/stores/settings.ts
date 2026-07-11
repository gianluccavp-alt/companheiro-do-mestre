import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Settings } from '../types'

const KEY = 'nc_settings'

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { theme: 'light', ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return { theme: 'light' }
}

export const useSettingsStore = defineStore('settings', () => {
  const s = load()
  const theme = ref<Settings['theme']>(s.theme)

  function apply() {
    document.documentElement.setAttribute('data-theme', theme.value)
  }
  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  apply()
  watch(theme, () => {
    apply()
    try {
      localStorage.setItem(KEY, JSON.stringify({ theme: theme.value }))
    } catch {
      /* ignore */
    }
  })

  return { theme, toggleTheme }
})
