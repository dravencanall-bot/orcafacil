import { useEffect, useState } from 'react'
import { podeInstalar, aoMudar, instalar, jaInstalado, ehIphone } from '../lib/instalar.js'

export default function BotaoInstalar() {
  const [pode, setPode] = useState(podeInstalar())
  const [ajudaIphone, setAjudaIphone] = useState(false)
  useEffect(() => aoMudar(setPode), [])

  if (jaInstalado()) return null
  if (pode) return <button className="botao instalar" onClick={instalar}>📲 Instalar o app no celular</button>
  if (ehIphone()) {
    return (
      <div className="instalar-iphone">
        <button className="botao instalar" onClick={() => setAjudaIphone((v) => !v)}>📲 Colocar na tela inicial</button>
        {ajudaIphone && <p className="dica">No Safari, toque em <strong>Compartilhar</strong> (quadrado com seta) e depois em <strong>Adicionar à Tela de Início</strong>.</p>}
      </div>
    )
  }
  return null
}
