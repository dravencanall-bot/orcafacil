import { useEffect, useState } from 'react'
import Inicio from './pages/Inicio.jsx'
import Editor from './pages/Editor.jsx'
import Ver from './pages/Ver.jsx'
import Perfil from './pages/Perfil.jsx'
import Publico from './pages/Publico.jsx'

// Navegação simples pelo "#" do endereço (ex.: site.com/#/novo).
// Funciona em qualquer hospedagem e depois dentro do app da loja.
function useRota() {
  const [hash, setHash] = useState(location.hash.slice(1) || '/')
  useEffect(() => {
    const f = () => {
      setHash(location.hash.slice(1) || '/')
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return hash.split('/').filter(Boolean)
}


export default function App() {
  const [pagina, a, b] = useRota()

  if (pagina === 'v') return <Publico codigo={a} />

  let conteudo
  if (pagina === 'novo') conteudo = <Editor tipo={a === 'recibo' ? 'recibo' : 'orcamento'} />
  else if (pagina === 'editar') conteudo = <Editor id={a} />
  else if (pagina === 'recibo-de') conteudo = <Editor deOrcamento={a} tipo="recibo" />
  else if (pagina === 'ver') conteudo = <Ver id={a} />
  else if (pagina === 'perfil') conteudo = <Perfil voltar={b} />
  else conteudo = <Inicio />

  return (
    <div className="app">
      <header className="topo nao-imprimir">
        <a href="#/" className="marca">
          <img src="/icon.svg" alt="" width="28" height="28" /> OrçaFácil
        </a>
        <a href="#/perfil" className="botao-link">Meus dados</a>
      </header>
      <main>{conteudo}</main>
    </div>
  )
}
