import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function NovaSenha() {
  const [senha, setSenha] = useState('')
  const [msg, setMsg] = useState('')
  const salvar = async (e) => {
    e.preventDefault()
    if (senha.length < 6) return setMsg('A senha precisa ter pelo menos 6 caracteres.')
    const { error } = await supabase.auth.updateUser({ password: senha })
    if (error) return setMsg('O link expirou. Peça outro em "Esqueci a senha".')
    location.hash = '/'
  }
  return (
    <form onSubmit={salvar} className="formulario entrar">
      <h1>Criar senha nova</h1>
      <fieldset><label>Senha nova<input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" autoFocus /></label></fieldset>
      {msg && <p className="erro">{msg}</p>}
      <button className="botao principal grande">Salvar senha</button>
    </form>
  )
}
