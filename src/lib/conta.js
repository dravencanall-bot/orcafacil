// Estado do login e do plano, compartilhado pelo app inteiro.
import { useEffect, useState } from 'react'
import { supabase, nuvemAtiva } from './supabase.js'
import { sincronizar, minhaConta, limparAparelho } from './dados.js'

let estado = { carregando: nuvemAtiva, user: null, conta: null, erro: '' }
const ouvintes = new Set()
const mudar = (m) => { estado = { ...estado, ...m }; ouvintes.forEach((f) => f(estado)) }

export function useConta() {
  const [e, setE] = useState(estado)
  useEffect(() => { ouvintes.add(setE); return () => ouvintes.delete(setE) }, [])
  return e
}

export async function atualizarConta() {
  const conta = await minhaConta()
  mudar({ conta })
  return conta
}

let sincronizadoPara = null
async function aoEntrar(user) {
  if (sincronizadoPara === user.id) return mudar({ user, carregando: false })
  mudar({ carregando: true, user })
  try {
    await sincronizar(user)
    sincronizadoPara = user.id
    await atualizarConta()
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
    if (evento === 'SIGNED_OUT') { sincronizadoPara = null; mudar({ user: null, conta: null, carregando: false }) }
    else if (session?.user && (evento === 'SIGNED_IN' || evento === 'INITIAL_SESSION')) setTimeout(() => aoEntrar(session.user), 0)
  })
}

export async function sair() {
  await supabase.auth.signOut()
  limparAparelho()
  location.hash = '/'
}

export const ehPro = (conta) => Boolean(conta?.pro)
export const diasRestantes = (conta) =>
  conta?.pro_ate ? Math.ceil((new Date(conta.pro_ate) - Date.now()) / 86400000) : 0
