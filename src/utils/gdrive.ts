// Integração leve com o Google Drive usando Google Identity Services (GIS)
// e a API REST do Drive. O backup fica na pasta "appDataFolder" (privada do app),
// então não polui o Drive do usuário e só este app consegue lê-lo.

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
const FILE_NAME = 'companheiro-backup.json'
const GIS_SRC = 'https://accounts.google.com/gsi/client'

export function isConfigured(): boolean {
  return !!CLIENT_ID
}

let gisLoaded: Promise<void> | null = null
function loadGis(): Promise<void> {
  if (gisLoaded) return gisLoaded
  gisLoaded = new Promise((resolve, reject) => {
    if ((window as unknown as { google?: unknown }).google) return resolve()
    const s = document.createElement('script')
    s.src = GIS_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Falha ao carregar o Google Identity Services.'))
    document.head.appendChild(s)
  })
  return gisLoaded
}

let cachedToken: string | null = null

export async function connect(): Promise<string> {
  if (!CLIENT_ID) throw new Error('Google Client ID não configurado (VITE_GOOGLE_CLIENT_ID).')
  await loadGis()
  return new Promise<string>((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callback: (resp: any) => {
        if (resp.error) return reject(new Error(resp.error))
        cachedToken = resp.access_token
        resolve(resp.access_token)
      }
    })
    tokenClient.requestAccessToken({ prompt: cachedToken ? '' : 'consent' })
  })
}

function authHeaders(token: string) {
  return { Authorization: 'Bearer ' + token }
}

async function findFileId(token: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${FILE_NAME}'`)
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)`
  const res = await fetch(url, { headers: authHeaders(token) })
  if (!res.ok) throw new Error('Erro ao consultar o Drive (HTTP ' + res.status + ').')
  const data = (await res.json()) as { files?: { id: string }[] }
  return data.files && data.files.length ? data.files[0].id : null
}

export async function upload(token: string, content: string): Promise<void> {
  const existingId = await findFileId(token)
  const boundary = 'cdm_' + Date.now()
  const metadata = existingId ? {} : { name: FILE_NAME, parents: ['appDataFolder'] }
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    content +
    `\r\n--${boundary}--`

  const url = existingId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'

  const res = await fetch(url, {
    method: existingId ? 'PATCH' : 'POST',
    headers: { ...authHeaders(token), 'Content-Type': `multipart/related; boundary=${boundary}` },
    body
  })
  if (!res.ok) throw new Error('Erro ao enviar o backup (HTTP ' + res.status + ').')
}

export async function download(token: string): Promise<string | null> {
  const id = await findFileId(token)
  if (!id) return null
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, {
    headers: authHeaders(token)
  })
  if (!res.ok) throw new Error('Erro ao baixar o backup (HTTP ' + res.status + ').')
  return await res.text()
}
