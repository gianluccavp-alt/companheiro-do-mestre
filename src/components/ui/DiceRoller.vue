<script setup lang="ts">
import { ref } from 'vue'
import { rollExpression, type RollResult } from '../../utils/dice'

const open = ref(false)
const expr = ref('')
const history = ref<RollResult[]>([])
const error = ref(false)

const QUICK = ['d20', 'd12', 'd10', 'd8', 'd6', 'd4', 'd%', '2d6', '4d6']

function roll(input: string) {
  const res = rollExpression(input)
  if (!res) {
    error.value = true
    return
  }
  error.value = false
  history.value.unshift(res)
  if (history.value.length > 30) history.value.pop()
}

function rollCustom() {
  if (!expr.value.trim()) return
  roll(expr.value)
}

function clearHistory() {
  history.value = []
}
</script>

<template>
  <button class="diceFab" :title="open ? 'Fechar rolador' : 'Rolar dados'" @click="open = !open">⬡ 🎲</button>
  <div v-if="open" class="dicePanel">
    <div class="dicePanelHead">
      <span>🎲 Rolador de Dados</span>
      <button class="mClose" style="position: static; font-size: 1rem" @click="open = false">✕</button>
    </div>
    <div class="diceQuick">
      <button v-for="q in QUICK" :key="q" class="btn btnOut sm" @click="roll(q)">{{ q }}</button>
    </div>
    <div style="display: flex; gap: 0.4rem; margin: 0.5rem 0">
      <input
        v-model="expr"
        type="text"
        :style="{ borderColor: error ? 'var(--red)' : '' }"
        placeholder="Ex: 2d8+3, 1d20-1"
        @keyup.enter="rollCustom"
      />
      <button class="btn btnRed sm" @click="rollCustom">Rolar</button>
    </div>
    <p v-if="error" style="font-family: var(--fN); font-size: 0.7rem; color: var(--red); margin-bottom: 0.4rem">Expressão inválida.</p>
    <div class="diceHist">
      <div v-if="!history.length" class="empty" style="padding: 0.8rem">Sem rolagens ainda.</div>
      <div v-for="(h, i) in history" :key="i" class="diceRow">
        <div class="diceTotal">{{ h.total }}</div>
        <div class="diceDetail">
          <div style="font-weight: 600">{{ h.expr }}</div>
          <div style="font-size: 0.72rem; color: var(--muted)">{{ h.detail }}</div>
        </div>
      </div>
    </div>
    <div v-if="history.length" style="text-align: right; margin-top: 0.4rem">
      <button class="btn btnOut sm" @click="clearHistory">Limpar histórico</button>
    </div>
  </div>
</template>
