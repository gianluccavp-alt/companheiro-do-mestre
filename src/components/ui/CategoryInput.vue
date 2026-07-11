<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{ modelValue: string; options: string[]; placeholder?: string }>()
const emit = defineEmits<{ 'update:modelValue': [v: string] }>()

const root = ref<HTMLElement | null>(null)
const open = ref(false)

const filtered = computed(() => {
  const term = (props.modelValue || '').trim().toLowerCase()
  const list = props.options.filter((o) => o && o.toLowerCase() !== term)
  if (!term) return list
  return list.filter((o) => o.toLowerCase().includes(term))
})

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
  open.value = true
}
function select(o: string) {
  emit('update:modelValue', o)
  open.value = false
}
function onDocClick(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('mousedown', onDocClick))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick))
</script>

<template>
  <div ref="root" class="catInput">
    <input
      :value="modelValue"
      type="text"
      :placeholder="placeholder"
      autocomplete="off"
      @input="onInput"
      @focus="open = true"
      @keydown.esc="open = false"
    />
    <div v-if="open && filtered.length" class="catMenu">
      <div v-for="o in filtered" :key="o" class="catOpt" @mousedown.prevent="select(o)">📁 {{ o }}</div>
    </div>
  </div>
</template>

<style scoped>
.catInput {
  position: relative;
}
.catInput input {
  width: 100%;
}
.catMenu {
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  right: 0;
  z-index: 50;
  background: var(--light);
  border: 1px solid var(--border);
  border-radius: 4px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
  max-height: 180px;
  overflow-y: auto;
}
.catOpt {
  padding: 0.4rem 0.6rem;
  cursor: pointer;
  font-family: var(--fB);
  font-size: 0.88rem;
  color: var(--ink);
}
.catOpt:hover {
  background: var(--bg3);
  color: var(--red);
}
</style>
