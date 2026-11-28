// Estado do login e do plano, compartilhado pelo app inteiro.
import { useEffect, useState } from 'react'
import { supabase, nuvemAtiva } from './supabase.js'
import { sincronizar, minhaConta, limparAparelho } from './dados.js'
import { baixarCatalogo } from './catalogo.js'
import { atualizarAberturas, limparAberturas } from './aberturas.js'

let estado = { carregando: nuvemAtiva, user: null, conta: null, admin: false, erro: '', pendentes: 0 }
const ouvintes = new Set()
const mudar = (m) => { estado = { ...estado, ...m }; ouvintes.forEach((f) => f(estado)) }

export function useConta() {
  const [e, setE] = useState(estado)
  useEffect(() => { ouvintes.add(setE); return () => ouvintes.delete(setE) }, [])
  return e
}

export async function atualizarConta() {
  if (!nuvemAtiva) return null
  const [conta, admin] = await Promise.all([minhaConta(), supabase.rpc('eh_admin').then((r) => r.data === true, () => false)])
  mudar({ conta, admin })
  if (admin) atualizarPendentes()
  return conta
}

// Painel do dono: quantas pessoas estão esperando a liberação do Pro (pontinho laranja).
export async function atualizarPendentes() {
  if (!nuvemAtiva || !estado.admin) return
  const r = await supabase.rpc('admin_resumo')
  if (!r.error) return mudar({ pendentes: Number(r.data?.pendentes) || 0, resumo: r.data })
  // SQL novo ainda não foi rodado no Supabase: conta pela lista antiga.
  const l = await supabase.rpc('admin_usuarios', { busca: '' })
  if (!l.error) mudar({ pendentes: (l.data || []).filter((u) => u.pedido_id).length })
}

// Atualiza quando a pessoa volta para o app e, de tempos em tempos, enquanto ele está aberto.
if (nuvemAtiva && typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && estado.user) atualizarConta()
  })
  setInterval(() => {
    if (document.visibilityState !== 'visible' || !estado.user) return
    if (estado.admin) atualizarPendentes()
    else if (estado.esperandoPro && !estado.conta?.pro) atualizarConta()
  }, 60000)
}

// Quem tocou em "Já paguei" fica conferindo de minuto em minuto se o Pro já foi liberado.
export const marcarEsperandoPro = (sim) => { if (estado.esperandoPro !== sim) mudar({ esperandoPro: sim }) }

let sincronizadoPara = null
async function aoEntrar(user) {
  if (sincronizadoPara === user.id) return mudar({ user, carregando: false })
  mudar({ carregando: true, user })
  try {
    await sincronizar(user)
    await baixarCatalogo(user).catch(() => {})
    sincronizadoPara = user.id
    await atualizarConta()
    atualizarAberturas()
    mudar({ carregando: false, erro: '' })
  } catch (e) {
    mudar({ carregando: false, erro: e.message })
  }
}

if (nuvemAtiva) {
  supabase.auth.getSession().then(({ data }) => {
    if (data.session?.user) aoEntrar(data.session.user)
    else mudar({ carregando: false })
  })
  supabase.auth.onAuthStateChange((evento, session) => {
    if (evento === 'PASSWORD_RECOVERY') setTimeout(() => { location.hash = '/nova-senha' }, 50)
    if (evento === 'SIGNED_OUT') { sincronizadoPara = null; mudar({ user: null, conta: null, admin: false, carregando: false, pendentes: 0 }) }
    else if (session?.user && (evento === 'SIGNED_IN' || evento === 'INITIAL_SESSION')) setTimeout(() => aoEntrar(session.user), 0)
  })
}

export async function sair() {
  await supabase.auth.signOut()
  limparAparelho()
  limparAberturas()
  location.hash = '/'
}

export const ehPro = (conta) => Boolean(conta?.pro)
export const diasRestantes = (conta) =>
  conta?.pro_ate ? Math.ceil((new Date(conta.pro_ate) - Date.now()) / 86400000) : 0
