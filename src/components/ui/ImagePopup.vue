<script setup lang="ts">
import BaseModal from './BaseModal.vue'

defineProps<{ open: boolean; name: string; img: string | null }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <BaseModal :open="open" @close="emit('close')">
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; gap: 0.7rem; max-width: 92vw">
      <button
        style="position: absolute; top: -2rem; right: 0; background: transparent; border: none; color: #ccc; font-size: 1.3rem; cursor: pointer"
        @click="emit('close')"
      >
        ✕
      </button>
      <p style="font-family: var(--fH); font-weight: 700; font-size: 1.1rem; color: #fff; text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7)">
        {{ name }}
      </p>
      <img
        v-if="img"
        :src="img"
        alt=""
        style="max-width: 90vw; max-height: 80vh; object-fit: contain; border-radius: 4px; border: 2px solid var(--border2); box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5)"
      />
      <div
        v-else
        style="background: var(--bg2); border: 2px solid var(--border); border-radius: 4px; padding: 1.5rem 2.5rem; color: var(--muted); font-style: italic"
      >
        Sem imagem
      </div>
    </div>
  </BaseModal>
</template>
