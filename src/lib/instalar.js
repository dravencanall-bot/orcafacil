// Guarda o convite do navegador para "instalar o app" (Android/Chrome).
let convite = null
const ouvintes = new Set()
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  convite = e
  ouvintes.forEach((f) => f(true))
})
window.addEventListener('appinstalled', () => { convite = null; ouvintes.forEach((f) => f(false)) })

export const podeInstalar = () => !!convite
export const aoMudar = (f) => { ouvintes.add(f); return () => ouvintes.delete(f) }
export async function instalar() {
  if (!convite) return false
  convite.prompt()
  const r = await convite.userChoice
  convite = null
  ouvintes.forEach((f) => f(false))
  return r.outcome === 'accepted'
}
export const jaInstalado = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone
export const ehIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
