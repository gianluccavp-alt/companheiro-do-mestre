// Extrai o ID de um vídeo do YouTube a partir de vários formatos de URL
// (watch?v=, youtu.be/, /embed/, /shorts/) ou de um ID cru.
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null
  const s = url.trim()
  // Já é um ID (11 caracteres típicos).
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s
  try {
    const u = new URL(s.includes('://') ? s : 'https://' + s)
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.split('/').filter(Boolean)[0]
      return id || null
    }
    if (u.searchParams.get('v')) return u.searchParams.get('v')
    const parts = u.pathname.split('/').filter(Boolean)
    const idx = parts.findIndex((p) => p === 'embed' || p === 'shorts' || p === 'v')
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1]
  } catch {
    /* url inválida */
  }
  return null
}

export function youtubeThumb(url: string | null | undefined): string | null {
  const id = youtubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

export function youtubeWatchUrl(url: string | null | undefined): string | null {
  const id = youtubeId(url)
  return id ? `https://www.youtube.com/watch?v=${id}` : null
}
