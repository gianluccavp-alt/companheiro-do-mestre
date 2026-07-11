<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useCampaignStore } from '../../stores/campaign'
import { REF_TYPES } from '../../constants'
import type { Reference } from '../../types'
import { fileToDataUrl } from '../../utils/image'
import BaseModal from '../ui/BaseModal.vue'
import ImagePopup from '../ui/ImagePopup.vue'
import ReferenceView from '../ui/ReferenceView.vue'
import CategoryInput from '../ui/CategoryInput.vue'

defineProps<{ active: boolean }>()

const store = useCampaignStore()
const camp = computed(() => store.activeCampaign)

function typeLabel(k: string) {
  return REF_TYPES.find((t) => t.k === k)?.l || k
}
function contentHint(type: string) {
  if (type === 'tabela') return 'Uma linha por linha da tabela; separe as células com , (a 1ª linha é o cabeçalho).'
  if (type === 'lista') return 'Um item por linha.'
  if (type === 'link') return 'Cole a URL completa (https://...).'
  if (type === 'imagem') return 'Carregue a imagem; o texto abaixo vira legenda (opcional).'
  if (type === 'musica') return 'Cole o link do YouTube acima; o texto abaixo vira a descrição (opcional).'
  return ''
}

// Formulário
const form = reactive({ name: '', type: 'texto', content: '', url: '', catParent: '', catChild: '' })
const fImg = ref<HTMLInputElement | null>(null)

// Categorias existentes (para autocompletar).
const parentCats = computed(() => {
  const set = new Set<string>()
  ;(camp.value.references || []).forEach((r) => {
    if (r.catParent) set.add(r.catParent)
  })
  return [...set].sort()
})
const childCats = computed(() => {
  const set = new Set<string>()
  ;(camp.value.references || []).forEach((r) => {
    if (r.catChild) set.add(r.catChild)
  })
  return [...set].sort()
})

async function addReference() {
  const name = form.name.trim()
  if (!name) {
    alert('Digite o nome!')
    return
  }
  let img: string | null = null
  if (form.type === 'imagem') {
    const file = fImg.value?.files?.[0]
    if (file) img = await fileToDataUrl(file)
    if (!img) {
      alert('Selecione uma imagem!')
      return
    }
  }
  if (form.type === 'musica' && !form.url.trim()) {
    alert('Cole o link do YouTube!')
    return
  }
  if (!camp.value.references) camp.value.references = []
  camp.value.references.push({
    id: nextId(),
    name,
    type: form.type,
    content: form.content.trim(),
    img,
    url: form.url.trim() || null,
    catParent: form.catParent.trim(),
    catChild: form.catChild.trim()
  })
  form.name = ''
  form.content = ''
  form.url = ''
}

// IDs únicos mesmo quando várias referências são criadas no mesmo milissegundo.
function nextId() {
  const list = camp.value.references || []
  const max = list.reduce((m, r) => Math.max(m, r.id), 0)
  return Math.max(Date.now(), max + 1)
}

// Filtros
const search = ref('')
const typeFilter = ref('')
const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  let list = (camp.value.references || []).slice()
  if (term)
    list = list.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        typeLabel(r.type).toLowerCase().includes(term) ||
        (r.catParent || '').toLowerCase().includes(term) ||
        (r.catChild || '').toLowerCase().includes(term)
    )
  if (typeFilter.value) list = list.filter((r) => r.type === typeFilter.value)
  return list
})

const NO_CAT = 'Sem categoria'
// Agrupa em pastas: pai -> filho -> referências.
const grouped = computed(() => {
  const parents = new Map<string, Map<string, Reference[]>>()
  for (const r of filtered.value) {
    const p = r.catParent?.trim() || NO_CAT
    const c = r.catChild?.trim() || ''
    if (!parents.has(p)) parents.set(p, new Map())
    const children = parents.get(p)!
    if (!children.has(c)) children.set(c, [])
    children.get(c)!.push(r)
  }
  const sortKeys = (arr: string[]) => arr.sort((a, b) => (a === NO_CAT ? 1 : b === NO_CAT ? -1 : a.localeCompare(b)))
  return sortKeys([...parents.keys()]).map((p) => ({
    parent: p,
    children: [...parents.get(p)!.keys()].sort((a, b) => a.localeCompare(b)).map((c) => ({ child: c, items: parents.get(p)!.get(c)! }))
  }))
})

const collapsed = reactive(new Set<string>())
function toggleFolder(key: string) {
  if (collapsed.has(key)) collapsed.delete(key)
  else collapsed.add(key)
}

function removeReference(id: number) {
  if (!confirm('Remover esta referência?')) return
  camp.value.references = (camp.value.references || []).filter((r) => r.id !== id)
}

// Editar
const edit = reactive({ open: false, id: 0, name: '', type: 'texto', content: '', img: null as string | null, url: '', catParent: '', catChild: '' })
const eImg = ref<HTMLInputElement | null>(null)
function openEdit(r: Reference) {
  edit.id = r.id
  edit.name = r.name
  edit.type = r.type
  edit.content = r.content
  edit.img = r.img || null
  edit.url = r.url || ''
  edit.catParent = r.catParent || ''
  edit.catChild = r.catChild || ''
  edit.open = true
  if (eImg.value) eImg.value.value = ''
}
async function saveEdit() {
  const r = (camp.value.references || []).find((x) => x.id === edit.id)
  if (!r) return
  r.name = edit.name.trim() || r.name
  r.type = edit.type
  r.content = edit.content.trim()
  r.url = edit.url.trim() || null
  r.catParent = edit.catParent.trim()
  r.catChild = edit.catChild.trim()
  const file = eImg.value?.files?.[0]
  if (file) r.img = await fileToDataUrl(file)
  edit.open = false
}

// Visualizar imagem ampliada
const viewer = reactive({ open: false, name: '', img: null as string | null })
function openImage(r: Reference) {
  viewer.name = r.name
  viewer.img = r.img || null
  viewer.open = true
}
</script>

<template>
  <div class="section" :class="{ active }">
    <h2 class="sTitle">Referências Rápidas</h2>

    <div class="card">
      <div class="fRow">
        <div class="fGrp"><label>Nome</label><input v-model="form.name" type="text" placeholder="Ex: Tabela de Saques, Regras de Queda..." /></div>
        <div class="fGrp" style="max-width: 150px">
          <label>Tipo</label>
          <select v-model="form.type">
            <option v-for="t in REF_TYPES" :key="t.k" :value="t.k">{{ t.l }}</option>
          </select>
        </div>
      </div>
      <div class="fRow">
        <div class="fGrp">
          <label>Categoria (pasta)</label>
          <CategoryInput v-model="form.catParent" :options="parentCats" placeholder="Ex: Trilha Sonora, Combate..." />
        </div>
        <div class="fGrp">
          <label>Subcategoria (opcional)</label>
          <CategoryInput v-model="form.catChild" :options="childCats" placeholder="Ex: Taverna, Boss..." />
        </div>
      </div>
      <div v-if="form.type === 'imagem'" style="margin-bottom: 0.5rem">
        <label class="ulabel" @click="fImg?.click()">⬡ Clique para carregar imagem</label>
        <input ref="fImg" type="file" accept="image/*" />
      </div>
      <div v-if="form.type === 'musica'" class="fGrp" style="margin-bottom: 0.6rem">
        <label>Link do YouTube</label>
        <input v-model="form.url" type="text" placeholder="https://www.youtube.com/watch?v=..." />
      </div>
      <div class="fGrp" style="margin-bottom: 0.6rem">
        <label>{{ form.type === 'imagem' ? 'Legenda (opcional)' : form.type === 'musica' ? 'Descrição (opcional)' : 'Conteúdo' }}</label>
        <textarea v-model="form.content" style="min-height: 90px" :placeholder="contentHint(form.type)"></textarea>
      </div>
      <p v-if="contentHint(form.type)" style="font-family: var(--fN); font-size: 0.72rem; color: var(--muted); font-style: italic; margin-bottom: 0.6rem">
        {{ contentHint(form.type) }}
      </p>
      <div style="text-align: right"><button class="btn btnRed" @click="addReference">+ Adicionar Referência</button></div>
    </div>

    <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.8rem; flex-wrap: wrap">
      <input v-model="search" type="text" placeholder="⬡ Pesquisar por nome ou tipo..." style="flex: 1; max-width: 260px" />
      <select v-model="typeFilter" style="font-family: var(--fH); font-size: 0.85rem; background: var(--light); border: 1px solid var(--border); color: var(--ink); padding: 0.35rem 0.6rem; border-radius: 3px; max-width: 160px">
        <option value="">Todos os Tipos</option>
        <option v-for="t in REF_TYPES" :key="t.k" :value="t.k">{{ t.l }}</option>
      </select>
    </div>

    <div>
      <div v-if="!filtered.length" class="empty">Nenhuma referência.</div>
      <div v-for="grp in grouped" :key="grp.parent" class="refFolder">
        <div class="refFolderHead" @click="toggleFolder(grp.parent)">
          <span class="refFolderCaret">{{ collapsed.has(grp.parent) ? '▸' : '▾' }}</span>
          <span class="refFolderName">📁 {{ grp.parent }}</span>
          <span class="refCount">{{ grp.children.reduce((n, s) => n + s.items.length, 0) }}</span>
        </div>
        <div v-show="!collapsed.has(grp.parent)" class="refFolderBody">
          <template v-for="sub in grp.children" :key="grp.parent + '/' + sub.child">
            <div v-if="sub.child" class="refSubHead" @click="toggleFolder(grp.parent + '/' + sub.child)">
              <span class="refFolderCaret">{{ collapsed.has(grp.parent + '/' + sub.child) ? '▸' : '▾' }}</span>
              <span>📂 {{ sub.child }}</span>
              <span class="refCount">{{ sub.items.length }}</span>
            </div>
            <div v-show="!sub.child || !collapsed.has(grp.parent + '/' + sub.child)" :class="{ refSubBody: sub.child }">
              <div v-for="r in sub.items" :key="r.id" class="card" style="margin-bottom: 0.7rem">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem">
                  <span style="font-family: var(--fH); font-weight: 700; color: var(--red); font-size: 1.05rem">{{ r.name }}</span>
                  <span class="dtChip" style="border-color: var(--border); color: var(--muted)">{{ typeLabel(r.type) }}</span>
                  <span style="margin-left: auto; display: flex; gap: 0.4rem">
                    <button class="btn btnOut sm" @click="openEdit(r)">✏</button>
                    <button class="btn btnDng sm" @click="removeReference(r.id)">✕</button>
                  </span>
                </div>
                <ReferenceView :reference="r" @open-image="openImage" />
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>

  <BaseModal :open="edit.open" @close="edit.open = false">
    <div class="modal" style="max-width: 520px; width: 92vw">
      <button class="mClose" @click="edit.open = false">✕</button>
      <h3>Editar Referência</h3>
      <div class="fRow">
        <div class="fGrp"><label>Nome</label><input v-model="edit.name" type="text" /></div>
        <div class="fGrp" style="max-width: 150px">
          <label>Tipo</label>
          <select v-model="edit.type">
            <option v-for="t in REF_TYPES" :key="t.k" :value="t.k">{{ t.l }}</option>
          </select>
        </div>
      </div>
      <div class="fRow">
        <div class="fGrp">
          <label>Categoria (pasta)</label>
          <CategoryInput v-model="edit.catParent" :options="parentCats" />
        </div>
        <div class="fGrp">
          <label>Subcategoria (opcional)</label>
          <CategoryInput v-model="edit.catChild" :options="childCats" />
        </div>
      </div>
      <div v-if="edit.type === 'imagem'" style="margin-bottom: 0.5rem">
        <label class="ulabel" @click="eImg?.click()">⬡ Trocar imagem</label>
        <input ref="eImg" type="file" accept="image/*" />
        <div v-if="edit.img" style="margin-top: 0.5rem; text-align: center">
          <img :src="edit.img" style="max-height: 120px; border-radius: 3px; border: 1px solid var(--border)" />
        </div>
      </div>
      <div v-if="edit.type === 'musica'" class="fGrp" style="margin-bottom: 0.6rem">
        <label>Link do YouTube</label>
        <input v-model="edit.url" type="text" placeholder="https://www.youtube.com/watch?v=..." />
      </div>
      <div class="fGrp" style="margin-bottom: 0.8rem">
        <label>{{ edit.type === 'imagem' ? 'Legenda (opcional)' : edit.type === 'musica' ? 'Descrição (opcional)' : 'Conteúdo' }}</label>
        <textarea v-model="edit.content" style="min-height: 110px" :placeholder="contentHint(edit.type)"></textarea>
      </div>
      <div style="text-align: right"><button class="btn btnRed" @click="saveEdit">Salvar</button></div>
    </div>
  </BaseModal>

  <ImagePopup :open="viewer.open" :name="viewer.name" :img="viewer.img" @close="viewer.open = false" />
</template>
