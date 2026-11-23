import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

const MENSAGENS = {
  'Invalid login credentials': 'E-mail ou senha errados.',
  'User already registered': 'Esse e-mail já tem conta. Toque em "Já tenho conta".',
  'Email not confirmed': 'Confirme seu e-mail pelo link que enviamos e tente de novo.',
}
const traduzir = (m) => MENSAGENS[m] || (m?.includes('Password should be') ? 'A senha precisa ter pelo menos 6 caracteres.' : m?.includes('rate limit') ? 'Muitas tentativas. Espere alguns minutos e tente de novo.' : 'Não deu certo: ' + m)

export default function Entrar({ modo: modoInicial }) {
  const [modo, setModo] = useState(modoInicial === 'criar' ? 'criar' : 'entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    setErro(''); setMsg('')
    if (!email.includes('@')) return setErro('Digite um e-mail válido.')
    if (modo !== 'esqueci' && senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.')
    setEnviando(true)
    try {
      if (modo === 'criar') {
        const { data, error } = await supabase.auth.signUp({ email, password: senha, options: { emailRedirectTo: location.origin } })
        if (error) throw error
        if (!data.session) setMsg('Conta criada! Abra seu e-mail e toque no link de confirmação para entrar.')
        else location.hash = '/'
      } else if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
        if (error) throw error
        location.hash = '/'
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin })
        if (error) throw error
        setMsg('Se esse e-mail tiver conta, enviamos um link para criar uma senha nova.')
      }
    } catch (e) {
      setErro(traduzir(e.message))
    }
    setEnviando(false)
  }

  return (
    <form onSubmit={enviar} className="formulario entrar">
      <h1>{modo === 'criar' ? 'Criar conta grátis' : modo === 'entrar' ? 'Entrar' : 'Esqueci a senha'}</h1>
      {modo === 'criar' && <p className="dica">Seus orçamentos ficam guardados na conta: trocou de celular, é só entrar de novo.</p>}
      <fieldset>
        <label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value.trim())} autoComplete="email" inputMode="email" autoFocus /></label>
        {modo !== 'esqueci' && (
          <label>Senha<input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete={modo === 'criar' ? 'new-password' : 'current-password'} placeholder={modo === 'criar' ? 'Mínimo 6 caracteres' : ''} /></label>
        )}
      </fieldset>
      {erro && <p className="erro">{erro}</p>}
      {msg && <p className="aviso">{msg}</p>}
      <button className="botao principal grande" disabled={enviando}>
        {enviando ? 'Aguarde...' : modo === 'criar' ? 'Criar minha conta' : modo === 'entrar' ? 'Entrar' : 'Enviar link'}
      </button>
      <div className="trocar-modo">
        {modo !== 'entrar' && <button type="button" className="botao-link-simples" onClick={() => setModo('entrar')}>Já tenho conta</button>}
        {modo !== 'criar' && <button type="button" className="botao-link-simples" onClick={() => setModo('criar')}>Criar conta grátis</button>}
        {modo === 'entrar' && <button type="button" className="botao-link-simples" onClick={() => setModo('esqueci')}>Esqueci a senha</button>}
      </div>
    </form>
  )
}
