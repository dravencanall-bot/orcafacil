import { useState } from 'react'
import { listarDocs } from '../lib/dados.js'
import { paraCobrar } from '../lib/cobranca.js'
import Icone from './Icone.jsx'

// Menu fixo embaixo, do jeito dos apps de celular.
export default function NavBaixo({ pagina }) {
  const [menu, setMenu] = useState(false)
  const { cobrar, lembrar } = paraCobrar(listarDocs())
  const pendentes = cobrar.length + lembrar.length
  const ativo = (p) => (p.includes(pagina || '') ? 'ativo' : '')

  return (
    <>
      {menu && (
        <div className="menu-novo-fundo" onClick={() => setMenu(false)}>
          <div className="menu-novo" onClick={(e) => e.stopPropagation()}>
            <a href="#/novo" className="menu-novo-opcao" onClick={() => setMenu(false)}>
              <span className="menu-novo-icone verde"><Icone nome="orcamento" tamanho={26} /></span>
              <span><strong>Novo orçamento</strong><small>Para o cliente aprovar e pagar</small></span>
            </a>
            <a href="#/novo/recibo" className="menu-novo-opcao" onClick={() => setMenu(false)}>
              <span className="menu-novo-icone azul"><Icone nome="recibo" tamanho={26} /></span>
              <span><strong>Novo recibo</strong><small>Comprovante de que você recebeu</small></span>
            </a>
          </div>
        </div>
      )}
      <nav className="nav-baixo nao-imprimir" aria-label="Menu principal">
        <a href="#/" className={ativo(['', 'inicio'])}><Icone nome="inicio" /><span>Início</span></a>
        <a href="#/cobrar" className={ativo(['cobrar'])}>
          <span className="com-badge"><Icone nome="cobrar" />{pendentes > 0 && <b className="badge">{pendentes > 9 ? '9+' : pendentes}</b>}</span>
          <span>Cobrar</span>
        </a>
        <button className={`nav-mais ${menu ? 'aberto' : ''}`} onClick={() => setMenu(!menu)} aria-label="Criar novo" aria-expanded={menu}>
          <Icone nome="mais" tamanho={30} />
        </button>
        <a href="#/catalogo" className={ativo(['catalogo'])}><Icone nome="catalogo" /><span>Catálogo</span></a>
        <a href="#/resumo" className={ativo(['resumo'])}><Icone nome="resumo" /><span>Resumo</span></a>
      </nav>
    </>
  )
}
