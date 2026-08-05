<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useCampaignStore } from '../../stores/campaign'
import type { Song, Playlist } from '../../types'
import { youtubeId, youtubeThumb, youtubeWatchUrl } from '../../utils/youtube'
import { loadYouTubeApi } from '../../utils/ytPlayer'
import BaseModal from '../ui/BaseModal.vue'

defineProps<{ active: boolean }>()

const store = useCampaignStore()
const camp = computed(() => store.activeCampaign)
const songs = computed<Song[]>(() => camp.value?.songs || [])
const playlists = computed<Playlist[]>(() => camp.value?.playlists || [])

// ---------- IDs únicos ----------
function nextId(list: { id: number }[]) {
  const max = list.reduce((m, x) => Math.max(m, x.id), 0)
  return Math.max(Date.now(), max + 1)
}

// ---------- Cadastro de músicas ----------
const form = reactive({ name: '', url: '', desc: '' })
function addSong() {
  const name = form.name.trim()
  const url = form.url.trim()
  if (!name) return alert('Digite o nome da música!')
  if (!url) return alert('Cole o link do YouTube!')
  if (!youtubeId(url)) return alert('O link do YouTube parece inválido.')
  if (!camp.value.songs) camp.value.songs = []
  camp.value.songs.push({ id: nextId(camp.value.songs), name, url, desc: form.desc.trim() })
  form.name = ''
  form.url = ''
  form.desc = ''
}

function removeSong(id: number) {
  if (!confirm('Remover esta música? Ela também sairá das playlists.')) return
  camp.value.songs = (camp.value.songs || []).filter((s) => s.id !== id)
  // Remove a música de todas as playlists.
  ;(camp.value.playlists || []).forEach((pl) => {
    pl.songIds = pl.songIds.filter((sid) => sid !== id)
  })
  if (nowPlaying.value?.id === id) stop()
}

// Editar música
const edit = reactive({ open: false, id: 0, name: '', url: '', desc: '' })
function openEdit(s: Song) {
  edit.id = s.id
  edit.name = s.name
  edit.url = s.url
  edit.desc = s.desc || ''
  edit.open = true
}
function saveEdit() {
  const s = (camp.value.songs || []).find((x) => x.id === edit.id)
  if (!s) return
  if (!youtubeId(edit.url.trim())) return alert('O link do YouTube parece inválido.')
  s.name = edit.name.trim() || s.name
  s.url = edit.url.trim()
  s.desc = edit.desc.trim()
  edit.open = false
}

// ---------- Playlists ----------
const newPlaylistName = ref('')
function addPlaylist() {
  const name = newPlaylistName.value.trim()
  if (!name) return alert('Digite o nome da playlist!')
  if (!camp.value.playlists) camp.value.playlists = []
  camp.value.playlists.push({ id: nextId(camp.value.playlists), name, songIds: [] })
  newPlaylistName.value = ''
}
function removePlaylist(id: number) {
  if (!confirm('Remover esta playlist? (As músicas continuam no acervo.)')) return
  camp.value.playlists = (camp.value.playlists || []).filter((p) => p.id !== id)
  if (playingContext.value?.type === 'playlist' && playingContext.value.id === id) stop()
}
function renamePlaylist(pl: Playlist) {
  const name = prompt('Novo nome da playlist:', pl.name)
  if (name && name.trim()) pl.name = name.trim()
}

// Músicas resolvidas de uma playlist (na ordem, ignorando ids órfãos).
function playlistSongs(pl: Playlist): Song[] {
  return pl.songIds.map((id) => songs.value.find((s) => s.id === id)).filter((s): s is Song => !!s)
}

// Seleção do <select> "adicionar música" por playlist.
const addSel = reactive<Record<number, string>>({})
function addSongToPlaylist(pl: Playlist) {
  const sel = addSel[pl.id]
  if (!sel) return
  pl.songIds.push(Number(sel))
  addSel[pl.id] = ''
}
function removeFromPlaylist(pl: Playlist, index: number) {
  pl.songIds.splice(index, 1)
}
function moveInPlaylist(pl: Playlist, index: number, dir: -1 | 1) {
  const j = index + dir
  if (j < 0 || j >= pl.songIds.length) return
  const arr = pl.songIds
  ;[arr[index], arr[j]] = [arr[j], arr[index]]
}

// ---------- Player ----------
let player: any = null
const playerReady = ref(false)
const queue = ref<Song[]>([])
const qIndex = ref(0)
const repeat = ref(false)
// Contexto do que está tocando (para exibir e destacar).
const playingContext = ref<{ type: 'song' | 'playlist'; name: string; id: number } | null>(null)

const nowPlaying = computed<Song | null>(() => queue.value[qIndex.value] || null)
const isPlaylist = computed(() => playingContext.value?.type === 'playlist')

function isPlayingSong(s: Song) {
  return nowPlaying.value?.id === s.id
}

// Cria o player uma vez (eager, no onMounted) para preservar o gesto do usuário
// no primeiro clique — assim o autoplay não é bloqueado pelo navegador.
async function ensurePlayer(): Promise<any> {
  if (player) return player
  const YT = await loadYouTubeApi()
  await new Promise<void>((resolve) => {
    player = new YT.Player('musicYtHost', {
      width: '100%',
      height: '100%',
      playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
      events: {
        onReady: () => {
          playerReady.value = true
          resolve()
        },
        onStateChange: (e: any) => {
          // 0 = ENDED
          if (e.data === 0) onEnded()
        }
      }
    })
  })
  return player
}

async function loadCurrent() {
  const s = nowPlaying.value
  if (!s) return
  const vid = youtubeId(s.url)
  if (!vid) {
    alert('Link do YouTube inválido nesta música.')
    return
  }
  if (player && playerReady.value) {
    player.loadVideoById(vid)
  } else {
    await ensurePlayer()
    player.loadVideoById(vid)
  }
}

function onEnded() {
  if (repeat.value) {
    // Modo repetição: recomeça a mesma faixa.
    player?.seekTo(0)
    player?.playVideo()
    return
  }
  // Playlist: avança para a próxima música, se houver.
  if (qIndex.value < queue.value.length - 1) {
    qIndex.value++
    loadCurrent()
  }
}

function playSong(s: Song) {
  queue.value = [s]
  qIndex.value = 0
  playingContext.value = { type: 'song', name: s.name, id: s.id }
  loadCurrent()
}

function playPlaylist(pl: Playlist, startIndex = 0) {
  const list = playlistSongs(pl)
  if (!list.length) return alert('Esta playlist está vazia.')
  queue.value = list
  qIndex.value = Math.min(Math.max(0, startIndex), list.length - 1)
  playingContext.value = { type: 'playlist', name: pl.name, id: pl.id }
  loadCurrent()
}

function next() {
  if (qIndex.value < queue.value.length - 1) {
    qIndex.value++
    loadCurrent()
  }
}
function prev() {
  if (qIndex.value > 0) {
    qIndex.value--
    loadCurrent()
  }
}
function stop() {
  try {
    player?.stopVideo()
  } catch {
    /* ignore */
  }
  queue.value = []
  qIndex.value = 0
  playingContext.value = null
}

function openYoutube(s: Song | null) {
  if (!s) return
  window.open(youtubeWatchUrl(s.url) || s.url, '_blank', 'noopener')
}

onMounted(() => {
  // Inicializa o player em segundo plano (sem vídeo) para que o primeiro
  // clique já toque imediatamente.
  ensurePlayer().catch(() => {
    /* sem conexão / API indisponível: tenta novamente ao tocar */
  })
})

onBeforeUnmount(() => {
  try {
    player?.destroy?.()
  } catch {
    /* ignore */
  }
  player = null
})
</script>

<template>
  <div class="section" :class="{ active }">
    <h2 class="sTitle">Músicas &amp; Trilha Sonora</h2>

    <!-- Reprodutor embutido -->
    <div class="card musicPlayerCard">
      <div class="ytWrap" v-show="nowPlaying">
        <div id="musicYtHost"></div>
      </div>
      <div v-if="nowPlaying" class="playerBar">
        <div class="npInfo">
          <span class="npLabel">{{ isPlaylist ? '🎵 Playlist: ' + playingContext?.name : '🎵 Tocando' }}</span>
          <span class="npName">{{ nowPlaying.name }}</span>
          <span v-if="isPlaylist" class="npPos">{{ qIndex + 1 }}/{{ queue.length }}</span>
        </div>
        <div class="playerControls">
          <button class="btn btnOut sm" :disabled="!isPlaylist || qIndex === 0" title="Anterior" @click="prev">⏮</button>
          <button class="btn btnOut sm" :disabled="!isPlaylist || qIndex >= queue.length - 1" title="Próxima" @click="next">⏭</button>
          <button class="btn sm" :class="repeat ? 'btnRed' : 'btnOut'" title="Repetir a música atual" @click="repeat = !repeat">🔁 Repetir</button>
          <button class="btn btnOut sm" @click="openYoutube(nowPlaying)">↗ Abrir no YouTube</button>
          <button class="btn btnDng sm" title="Parar" @click="stop">✕</button>
        </div>
      </div>
      <div v-else class="empty" style="margin: 0">Nenhuma música tocando. Clique numa música ou playlist abaixo.</div>
    </div>

    <!-- Cadastro de música -->
    <div class="card">
      <div class="fRow">
        <div class="fGrp"><label>Nome</label><input v-model="form.name" type="text" placeholder="Ex: Tema da Taverna" /></div>
      </div>
      <div class="fGrp" style="margin-bottom: 0.6rem">
        <label>Link do YouTube</label>
        <input v-model="form.url" type="text" placeholder="https://www.youtube.com/watch?v=..." />
      </div>
      <div class="fGrp" style="margin-bottom: 0.6rem">
        <label>Descrição (opcional)</label>
        <textarea v-model="form.desc" style="min-height: 60px" placeholder="Quando usar, clima, cena..."></textarea>
      </div>
      <div style="text-align: right"><button class="btn btnRed" @click="addSong">+ Adicionar Música</button></div>
    </div>

    <!-- Acervo de músicas -->
    <h3 class="subTitle">Músicas</h3>
    <div v-if="!songs.length" class="empty">Nenhuma música cadastrada ainda.</div>
    <div v-for="s in songs" :key="s.id" class="card musicRow" :class="{ playing: isPlayingSong(s) }">
      <img v-if="youtubeThumb(s.url)" :src="youtubeThumb(s.url)!" :alt="s.name" class="musicThumb" @click="playSong(s)" />
      <div class="musicMeta">
        <div class="musicName">{{ s.name }}</div>
        <div v-if="s.desc" class="musicDesc">{{ s.desc }}</div>
      </div>
      <div class="musicActions">
        <button class="btn btnRed sm" @click="playSong(s)">▶ Tocar</button>
        <button class="btn btnOut sm" @click="openYoutube(s)">↗ YouTube</button>
        <button class="btn btnOut sm" @click="openEdit(s)">✏</button>
        <button class="btn btnDng sm" @click="removeSong(s.id)">✕</button>
      </div>
    </div>

    <!-- Playlists -->
    <h3 class="subTitle">Playlists</h3>
    <div class="card">
      <div style="display: flex; gap: 0.5rem; align-items: flex-end; flex-wrap: wrap">
        <div class="fGrp" style="flex: 1; min-width: 180px; margin: 0">
          <label>Nova playlist</label>
          <input v-model="newPlaylistName" type="text" placeholder="Ex: Combate Épico" @keyup.enter="addPlaylist" />
        </div>
        <button class="btn btnRed" @click="addPlaylist">+ Criar Playlist</button>
      </div>
    </div>

    <div v-if="!playlists.length" class="empty">Nenhuma playlist criada ainda.</div>
    <div v-for="pl in playlists" :key="pl.id" class="card">
      <div class="plHead">
        <span class="plName">📃 {{ pl.name }}</span>
        <span class="refCount">{{ pl.songIds.length }}</span>
        <span style="margin-left: auto; display: flex; gap: 0.4rem">
          <button class="btn btnRed sm" :disabled="!playlistSongs(pl).length" @click="playPlaylist(pl)">▶ Tocar</button>
          <button class="btn btnOut sm" title="Renomear" @click="renamePlaylist(pl)">✏</button>
          <button class="btn btnDng sm" @click="removePlaylist(pl.id)">✕</button>
        </span>
      </div>

      <div v-if="!playlistSongs(pl).length" class="empty" style="margin: 0.4rem 0">Playlist vazia. Adicione músicas abaixo.</div>
      <ol v-else class="plList">
        <li v-for="(s, i) in playlistSongs(pl)" :key="pl.id + '-' + s.id + '-' + i" class="plItem" :class="{ playing: isPlaylist && playingContext?.id === pl.id && isPlayingSong(s) }">
          <button class="plPlay" title="Tocar a partir daqui" @click="playPlaylist(pl, i)">▶</button>
          <span class="plItemName">{{ s.name }}</span>
          <span class="plItemBtns">
            <button class="btn btnOut sm" :disabled="i === 0" title="Subir" @click="moveInPlaylist(pl, i, -1)">▲</button>
            <button class="btn btnOut sm" :disabled="i === pl.songIds.length - 1" title="Descer" @click="moveInPlaylist(pl, i, 1)">▼</button>
            <button class="btn btnDng sm" title="Remover da playlist" @click="removeFromPlaylist(pl, i)">✕</button>
          </span>
        </li>
      </ol>

      <div v-if="songs.length" style="display: flex; gap: 0.5rem; align-items: center; margin-top: 0.6rem; flex-wrap: wrap">
        <select v-model="addSel[pl.id]" class="plSelect">
          <option value="">+ Adicionar música...</option>
          <option v-for="s in songs" :key="s.id" :value="String(s.id)">{{ s.name }}</option>
        </select>
        <button class="btn btnOut sm" :disabled="!addSel[pl.id]" @click="addSongToPlaylist(pl)">Adicionar</button>
      </div>
      <p v-else style="font-family: var(--fN); font-size: 0.72rem; color: var(--muted); font-style: italic; margin: 0.5rem 0 0">
        Cadastre músicas acima para poder adicioná-las às playlists.
      </p>
    </div>
  </div>

  <!-- Modal de edição de música -->
  <BaseModal :open="edit.open" @close="edit.open = false">
    <div class="modal" style="max-width: 480px; width: 92vw">
      <button class="mClose" @click="edit.open = false">✕</button>
      <h3>Editar Música</h3>
      <div class="fGrp" style="margin-bottom: 0.6rem"><label>Nome</label><input v-model="edit.name" type="text" /></div>
      <div class="fGrp" style="margin-bottom: 0.6rem"><label>Link do YouTube</label><input v-model="edit.url" type="text" /></div>
      <div class="fGrp" style="margin-bottom: 0.8rem"><label>Descrição (opcional)</label><textarea v-model="edit.desc" style="min-height: 70px"></textarea></div>
      <div style="text-align: right"><button class="btn btnRed" @click="saveEdit">Salvar</button></div>
    </div>
  </BaseModal>
</template>

<!-- Estilo global (sem scope) para a iframe criada dinamicamente pela API do YouTube,
     que não recebe o atributo data-v do escopo. -->
<style>
#musicYtHost {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
</style>

<style scoped>
.subTitle {
  font-family: var(--fH);
  color: var(--red);
  font-size: 1.15rem;
  margin: 1.4rem 0 0.6rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.3rem;
}
.musicPlayerCard {
  margin-bottom: 1rem;
}
.ytWrap {
  position: relative;
  width: 100%;
  max-width: 680px;
  margin: 0 auto 0.7rem;
  padding-bottom: 56.25%;
  background: #000;
  border-radius: 6px;
  overflow: hidden;
}
.playerBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.npInfo {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
  min-width: 0;
}
.npLabel {
  font-family: var(--fN);
  font-size: 0.72rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.npName {
  font-family: var(--fH);
  font-weight: 700;
  color: var(--red);
  font-size: 1.05rem;
}
.npPos {
  font-family: var(--fN);
  font-size: 0.75rem;
  color: var(--muted);
}
.playerControls {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}
.musicRow {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin-bottom: 0.6rem;
}
.musicRow.playing {
  border-color: var(--red);
  box-shadow: 0 0 0 1px var(--red) inset;
}
.musicThumb {
  width: 96px;
  height: 54px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid var(--border);
  cursor: pointer;
  flex-shrink: 0;
}
.musicMeta {
  flex: 1;
  min-width: 0;
}
.musicName {
  font-family: var(--fH);
  font-weight: 700;
  color: var(--ink);
  font-size: 1rem;
}
.musicDesc {
  font-family: var(--fB);
  font-size: 0.82rem;
  color: var(--muted);
  white-space: pre-wrap;
  margin-top: 0.15rem;
}
.musicActions {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.plHead {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}
.plName {
  font-family: var(--fH);
  font-weight: 700;
  color: var(--red);
  font-size: 1.05rem;
}
.plList {
  list-style: none;
  margin: 0;
  padding: 0;
}
.plItem {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.4rem;
  border-radius: 4px;
  border: 1px solid transparent;
}
.plItem:nth-child(odd) {
  background: var(--bg3);
}
.plItem.playing {
  border-color: var(--red);
  background: var(--light);
}
.plPlay {
  background: none;
  border: none;
  color: var(--red);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.1rem 0.3rem;
  flex-shrink: 0;
}
.plItemName {
  flex: 1;
  min-width: 0;
  font-family: var(--fB);
  font-size: 0.9rem;
  color: var(--ink);
}
.plItemBtns {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}
.plSelect {
  font-family: var(--fH);
  font-size: 0.85rem;
  background: var(--light);
  border: 1px solid var(--border);
  color: var(--ink);
  padding: 0.35rem 0.6rem;
  border-radius: 3px;
  flex: 1;
  min-width: 160px;
  max-width: 280px;
}
</style>
