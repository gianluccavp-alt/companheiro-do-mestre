<script setup lang="ts">
import type { StatEntry } from '../../types'

// A lista é passada por referência (objeto reativo do pai) e mutada in-place.
const props = defineProps<{ list: StatEntry[]; addLabel?: string }>()

function add() {
  props.list.push({ name: '', desc: '' })
}
function remove(i: number) {
  props.list.splice(i, 1)
}
function move(i: number, dir: number) {
  const ni = i + dir
  if (ni < 0 || ni >= props.list.length) return
  const tmp = props.list[i]
  props.list[i] = props.list[ni]
  props.list[ni] = tmp
}

function resize(el: HTMLTextAreaElement) {
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}
const vAutoGrow = {
  mounted(el: HTMLTextAreaElement) {
    resize(el)
    el.addEventListener('input', () => resize(el))
  },
  updated(el: HTMLTextAreaElement) {
    resize(el)
  }
}
</script>

<template>
  <div class="seList">
    <div v-if="!list.length" class="empty" style="padding: 0.6rem; font-size: 0.85rem">Nenhuma entrada.</div>
    <div v-for="(e, i) in list" :key="i" class="seCard">
      <div class="seCardHead">
        <input v-model="e.name" type="text" class="seName" placeholder="Nome (ex: Multiattack)" />
        <div class="seBtns">
          <button type="button" class="seBtn" title="Mover para cima" @click="move(i, -1)">↑</button>
          <button type="button" class="seBtn" title="Mover para baixo" @click="move(i, 1)">↓</button>
          <button type="button" class="seBtn seDel" title="Remover" @click="remove(i)">✕</button>
        </div>
      </div>
      <textarea v-model="e.desc" v-auto-grow class="seDesc" placeholder="Descrição..."></textarea>
    </div>
    <button type="button" class="btn btnOut sm seAdd" @click="add">+ {{ addLabel || 'Adicionar entrada' }}</button>
  </div>
</template>

<style scoped>
.seList {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.seCard {
  background: var(--bg);
  border: 1px solid var(--border);
  border-left: 3px solid var(--red);
  border-radius: 4px;
  padding: 0.5rem 0.6rem;
}
.seCardHead {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  margin-bottom: 0.4rem;
}
.seName {
  flex: 1;
  min-width: 0;
  font-family: var(--fH) !important;
  font-weight: 600;
}
.seBtns {
  display: flex;
  gap: 0.25rem;
}
.seBtn {
  font-family: var(--fH);
  font-weight: 600;
  font-size: 0.75rem;
  padding: 0.25rem 0.45rem;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
  border-radius: 3px;
  cursor: pointer;
}
.seBtn:hover {
  border-color: var(--border2);
  color: var(--ink);
}
.seDel:hover {
  background: #8b0000;
  border-color: #a00;
  color: #ffc8c8;
}
.seDesc {
  width: 100%;
  min-height: 54px;
  resize: vertical;
  overflow: hidden;
  line-height: 1.5;
}
.seAdd {
  align-self: flex-start;
}
</style>
