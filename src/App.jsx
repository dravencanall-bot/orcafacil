import { useEffect, useState } from 'react'
import Inicio from './pages/Inicio.jsx'
import Editor from './pages/Editor.jsx'
import Ver from './pages/Ver.jsx'
import Perfil from './pages/Perfil.jsx'
import Publico from './pages/Publico.jsx'
import Entrar from './pages/Entrar.jsx'
import NovaSenha from './pages/NovaSenha.jsx'
import Plano from './pages/Plano.jsx'
import BoasVindas from './pages/BoasVindas.jsx'
import Admin from './pages/Admin.jsx'
import ProAtivado from './components/ProAtivado.jsx'
import Catalogo from './pages/Catalogo.jsx'
import Resumo from './pages/Resumo.jsx'
import Cobrar from './pages/Cobrar.jsx'
import NavBaixo from './components/NavBaixo.jsx'
import Avisos from './components/Avisos.jsx'
import Confete from './components/Confete.jsx'
import Icone from './components/Icone.jsx'
import { nuvemAtiva } from './lib/supabase.js'
import { useConta } from './lib/conta.js'
import { lerPerfil } from './lib/dados.js'

// Navegação simples pelo "#" do endereço (ex.: site.com/#/novo).
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
  // Ignora o "#access_token=..." que o Supabase usa ao voltar de um link de e-mail.
  if (hash.includes('access_token=') || hash.includes('error=')) return ['']
  return hash.split('/').filter(Boolean)
}

export default function App() {
  const [pagina, a, b] = useRota()
  const { user, conta, admin, carregando, erro, pendentes } = useConta()

  if (pagina === 'v') return <Publico codigo={a} />
  if (pagina === 'o') return <Publico id={a} />
  if (pagina === 'exemplo') return <Publico exemplo />

  let conteudo
  if (nuvemAtiva && carregando) {
    conteudo = <p className="vazio">Carregando seus orçamentos...</p>
  } else if (nuvemAtiva && pagina === 'nova-senha') {
    conteudo = <NovaSenha />
  } else if (nuvemAtiva && !user) {
    conteudo = pagina === 'entrar' ? <Entrar modo={a} /> : <BoasVindas />
  } else if (pagina === 'novo') conteudo = <Editor tipo={a === 'recibo' ? 'recibo' : 'orcamento'} />
  else if (pagina === 'editar') conteudo = <Editor id={a} />
  else if (pagina === 'copiar') conteudo = <Editor copiaDe={a} />
  else if (pagina === 'recibo-de') conteudo = <Editor deOrcamento={a} tipo="recibo" />
  else if (pagina === 'ver') conteudo = <Ver id={a} />
  else if (pagina === 'perfil') conteudo = <Perfil voltar={b} />
  else if (pagina === 'plano' && nuvemAtiva) conteudo = <Plano />
  else if (pagina === 'admin' && nuvemAtiva) conteudo = <Admin />
  else if (pagina === 'catalogo') conteudo = <Catalogo />
  else if (pagina === 'resumo') conteudo = <Resumo />
  else if (pagina === 'cobrar') conteudo = <Cobrar />
  else conteudo = <Inicio />

  const logado = !nuvemAtiva || (user && !carregando)
  // Nas telas de preencher (com botão Salvar embaixo) o menu de baixo some.
  const comMenu = logado && !!lerPerfil().nome && !['novo', 'editar', 'copiar', 'recibo-de', 'perfil', 'nova-senha', 'entrar'].includes(pagina)

  return (
    <div className={`app ${comMenu ? 'com-menu' : ''}`}>
      <header className="topo nao-imprimir">
        <a href="#/" className="marca">
          <img src="/icon.svg" alt="" width="28" height="28" /> OrçaFechou
        </a>
        {(!nuvemAtiva || user) && (
          <nav className="menu">
            {nuvemAtiva && admin && (
              <a href="#/admin" className="botao-link com-ponto" aria-label={pendentes ? `Painel: ${pendentes} esperando liberação` : 'Painel'}>
                Painel{pendentes > 0 && <span className="ponto-notif">{pendentes > 9 ? '9+' : pendentes}</span>}
              </a>
            )}
            {nuvemAtiva && !admin && <a href="#/plano" className={conta?.pro ? 'selo-pro' : 'botao-link'}>{conta?.pro ? 'PRO' : 'Seja Pro'}</a>}
            {pagina && pagina !== 'inicio' && <a href="#/perfil" className="botao-redondo" aria-label="Meus dados"><Icone nome="pessoa" /></a>}
          </nav>
        )}
        {nuvemAtiva && !user && !carregando && pagina !== 'entrar' && <a href="#/entrar" className="botao-link">Entrar</a>}
      </header>
      {erro && <p className="erro">{erro}</p>}
      <main key={[pagina, a, b].join('/')}>{conteudo}</main>
      {comMenu && <NavBaixo pagina={pagina} />}
      <Avisos />
      <Confete />
      {nuvemAtiva && user && <ProAtivado />}
    </div>
  )
}
