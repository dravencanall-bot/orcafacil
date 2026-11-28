import { useEffect, useState } from 'react'
import { podeInstalar, aoMudar, instalar, jaInstalado, ehIphone, ehAndroid, ehSafari, ehNavegadorDeApp, adiado, adiar } from '../lib/instalar.js'

// Cartão chamativo para instalar o app. Some quando o app já está instalado.
// podeFechar: mostra "Agora não" (esconde por 7 dias).
export default function BotaoInstalar({ podeFechar = false }) {
  const [pode, setPode] = useState(podeInstalar())
  const [passos, setPassos] = useState(false)
  const [instalado, setInstalado] = useState(false)
  const [fechado, setFechado] = useState(podeFechar && adiado())
  useEffect(() => aoMudar(setPode), [])

  if (jaInstalado() || fechado) return null
  const celular = ehIphone() || ehAndroid()
  if (!pode && !celular) return null // computador sem suporte: não mostra

  if (instalado) {
    return (
      <div className="instalar-cartao feito">
        <strong>✅ Pronto! O OrçaFechou está no seu celular.</strong>
        <span>Procure o ícone verde na tela inicial e abra por lá.</span>
      </div>
    )
  }

  const clicar = async () => {
    if (pode) { if (await instalar()) setInstalado(true); return }
    setPassos(true)
  }

  return (
    <>
      <div className="instalar-cartao">
        <div className="instalar-topo">
          <img src="/icon-192.png" alt="" width="56" height="56" />
          <div>
            <strong>Tenha o OrçaFechou na tela do celular</strong>
            <span>Abre na hora, como um app. Grátis e leve.</span>
          </div>
          {podeFechar && <button className="instalar-fechar" aria-label="Agora não" onClick={() => { adiar(); setFechado(true) }}>×</button>}
        </div>
        <ul className="instalar-vantagens">
          <li>⚡ Abre em 1 toque</li>
          <li>📱 Tela cheia, sem navegador</li>
          <li>💾 Quase não ocupa espaço</li>
        </ul>
        <button className="botao-instalar" onClick={clicar}>
          <span aria-hidden="true">📲</span> Instalar app grátis
        </button>
      </div>
      {passos && <Passos fechar={() => setPassos(false)} />}
    </>
  )
}

function Passos({ fechar }) {
  let titulo, lista
  if (ehNavegadorDeApp()) {
    titulo = 'Primeiro, abra no navegador'
    lista = ehIphone()
      ? [<>Toque nos <b>três pontinhos ⋯</b> ou na <b>bússola 🧭</b> aqui na tela.</>, <>Escolha <b>Abrir no Safari</b>.</>, <>Lá, toque de novo em <b>Instalar app grátis</b>.</>]
      : [<>Toque nos <b>três pontinhos ⋮</b> no canto de cima.</>, <>Escolha <b>Abrir no Chrome</b>.</>, <>Lá, toque de novo em <b>Instalar app grátis</b>.</>]
  } else if (ehIphone()) {
    titulo = 'Instalar no iPhone'
    lista = [
      ehSafari()
        ? <>Toque em <b>Compartilhar</b> <IconeCompartilhar /> na barra do Safari. <small>(Se não aparecer, toque antes nos <b>⋯</b>.)</small></>
        : <>Toque em <b>Compartilhar</b> <IconeCompartilhar /> no canto de cima.</>,
      <>Role e toque em <b>Adicionar à Tela de Início</b> ➕.</>,
      <>Toque em <b>Adicionar</b>. Pronto, o ícone aparece na sua tela!</>,
    ]
  } else {
    titulo = 'Instalar no Android'
    lista = [
      <>Toque nos <b>três pontinhos ⋮</b> no canto de cima do Chrome.</>,
      <>Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</>,
      <>Confirme em <b>Instalar</b>. Pronto, o ícone aparece na sua tela!</>,
    ]
  }
  return (
    <div className="instalar-fundo" onClick={fechar}>
      <div className="instalar-folha" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <img src="/icon-192.png" alt="" width="64" height="64" />
        <h2>{titulo}</h2>
        <ol>{lista.map((p, i) => <li key={i}><span className="num">{i + 1}</span><span>{p}</span></li>)}</ol>
        <button className="botao principal grande" onClick={fechar}>Entendi</button>
      </div>
    </div>
  )
}

const IconeCompartilhar = () => (
  <svg className="icone-compartilhar" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 11v9h14v-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
