// Mesmo db/store/chave do app original, para manter compatibilidade com dados
// já salvos por usuários existentes (ver legacy/index.html linhas 509-522).
const DB_NAME = 'CompanheiroMestre'
const STORE = 'kv'

let _db: IDBDatabase | null = null

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (_db) {
      resolve(_db)
      return
    }
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = (e) => {
      ;(e.target as IDBOpenDBRequest).result.createObjectStore(STORE)
    }
    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result
      resolve(_db)
    }
    req.onerror = () => reject(req.error)
  })
}

export function idbSet(key: string, value: unknown): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).put(value, key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
  )
}

export function idbGet<T = unknown>(key: string): Promise<T | undefined> {
  return openDB().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly')
        const req = tx.objectStore(STORE).get(key)
        req.onsuccess = (e) => resolve((e.target as IDBRequest).result)
        req.onerror = () => reject(req.error)
      })
  )
}
