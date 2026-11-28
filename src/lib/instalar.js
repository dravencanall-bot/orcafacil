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
export const jaInstalado = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true

const ua = () => navigator.userAgent || ''
export const ehIphone = () => /iphone|ipad|ipod/i.test(ua()) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const ehAndroid = () => /android/i.test(ua())
// Navegador de dentro de outro app (WhatsApp, Instagram, Facebook...): lá não dá pra instalar.
export const ehNavegadorDeApp = () => /FBAN|FBAV|Instagram|WhatsApp|Line\/|; wv\)/i.test(ua())
// No iPhone, Chrome/Firefox/Edge também conseguem (iOS 16.4+), mas o caminho é outro.
export const ehSafari = () => ehIphone() && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua()) && !ehNavegadorDeApp()

// "Agora não" na tela inicial: some por 7 dias.
const CHAVE = 'orcafechou:instalar-depois'
export function adiado() {
  try { return Date.now() < Number(localStorage.getItem(CHAVE) || 0) } catch { return false }
}
export function adiar(dias = 7) {
  try { localStorage.setItem(CHAVE, String(Date.now() + dias * 864e5)) } catch { /* sem armazenamento: tudo bem */ }
}
