export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = (e) => resolve(e.target?.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}
