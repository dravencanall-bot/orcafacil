// Mensagens rápidas que aparecem embaixo da tela ("Link copiado!", "Salvo no catálogo"...).
import { useEffect, useState } from 'react'

let lista = []
const ouvintes = new Set()
const mudar = (l) => { lista = l; ouvintes.forEach((f) => f(lista)) }
let seq = 0

export function avisar(texto, { tipo = 'ok', tempo = 2600, acao } = {}) {
  const id = ++seq
  mudar([...lista, { id, texto, tipo, acao }])
  if (tempo) setTimeout(() => fecharAviso(id), tempo)
  return id
}
export const fecharAviso = (id) => mudar(lista.filter((a) => a.id !== id))

export function useAvisos() {
  const [l, setL] = useState(lista)
  useEffect(() => { ouvintes.add(setL); return () => ouvintes.delete(setL) }, [])
  return l
}

// "agora", "há 5 min", "há 2 h", "ontem", "há 3 dias"
export function tempoAtras(iso) {
  if (!iso) return ''
  const s = (Date.now() - new Date(iso)) / 1000
  if (s < 90) return 'agora'
  if (s < 3600) return `há ${Math.round(s / 60)} min`
  if (s < 86400) return `há ${Math.round(s / 3600)} h`
  const d = Math.floor(s / 86400)
  return d === 1 ? 'ontem' : `há ${d} dias`
}
