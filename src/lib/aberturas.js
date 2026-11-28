// "O cliente abriu seu orçamento": o link público registra a abertura no servidor
// e o app do profissional confere de tempos em tempos.
import { useEffect, useState } from 'react'
import { supabase, nuvemAtiva } from './supabase.js'

const CHAVE_VISTAS = 'of_aberturas_vistas'
let estado = { mapa: {}, bloqueado: false, total: 0, ultima: null, novas: [], pronto: false }
const ouvintes = new Set()
const mudar = (m) => { estado = { ...estado, ...m }; ouvintes.forEach((f) => f(estado)) }

const lerVistas = () => { try { return JSON.parse(localStorage.getItem(CHAVE_VISTAS)) || {} } catch { return {} } }
const gravarVistas = (v) => { try { localStorage.setItem(CHAVE_VISTAS, JSON.stringify(v)) } catch { /* sem espaço */ } }

export function useAberturas() {
  const [e, setE] = useState(estado)
  useEffect(() => { ouvintes.add(setE); return () => ouvintes.delete(setE) }, [])
  return e
}

// Página do cliente: avisa o servidor que o link foi aberto.
export function registrarAbertura(id) {
  if (!nuvemAtiva || !id) return
  supabase.rpc('marcar_aberto', { codigo: id }).then(() => {}, () => {})
}

let buscando = false
export async function atualizarAberturas() {
  if (!nuvemAtiva || buscando) return
  buscando = true
  try {
    const { data, error } = await supabase.rpc('minhas_aberturas')
    if (error || !data) return
    const vistas = lerVistas()
    const primeiraVez = !vistas._iniciado
    if (data.bloqueado) {
      const novas = !primeiraVez && data.ultima && data.ultima > (vistas._gratis || '') ? [{ bloqueado: true, ultima: data.ultima }] : []
      if (primeiraVez || !data.ultima) gravarVistas({ ...vistas, _iniciado: true, _gratis: data.ultima || '' })
      return mudar({ bloqueado: true, total: data.total || 0, ultima: data.ultima, mapa: {}, novas, pronto: true })
    }
    const mapa = {}
    for (const a of data.lista || []) mapa[a.doc] = a
    // Na primeira vez neste aparelho, não enche a tela de avisos antigos.
    const novas = primeiraVez ? [] : Object.values(mapa).filter((a) => a.ultima > (vistas[a.doc] || '')).sort((a, b) => b.ultima.localeCompare(a.ultima))
    if (primeiraVez) {
      const v = { _iniciado: true }
      for (const a of Object.values(mapa)) v[a.doc] = a.ultima
      gravarVistas(v)
    }
    mudar({ bloqueado: false, mapa, novas, pronto: true })
  } finally {
    buscando = false
  }
}

// Tira o aviso da tela (o profissional já viu).
export function marcarVisto(docId) {
  const v = lerVistas()
  if (docId === 'gratis') v._gratis = estado.ultima || ''
  else if (estado.mapa[docId]) v[docId] = estado.mapa[docId].ultima
  gravarVistas(v)
  mudar({ novas: estado.novas.filter((a) => (docId === 'gratis' ? !a.bloqueado : a.doc !== docId)) })
}

export const limparAberturas = () => { localStorage.removeItem(CHAVE_VISTAS); mudar({ mapa: {}, novas: [], bloqueado: false, total: 0, pronto: false }) }

if (nuvemAtiva && typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && estado.pronto) atualizarAberturas() })
  setInterval(() => { if (document.visibilityState === 'visible' && estado.pronto) atualizarAberturas() }, 45000)
}
