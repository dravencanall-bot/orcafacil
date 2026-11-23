import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { gerarPix } from '../lib/pix.js'
import { dinheiro } from '../lib/formato.js'

export default function PixBox({ perfil, valor, identificador }) {
  const codigo = gerarPix({
    chave: perfil.pixChave, tipo: perfil.pixEscolha, nome: perfil.pixNome || perfil.nome,
    cidade: perfil.cidade, valor, identificador,
  })
  const [qr, setQr] = useState('')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    if (codigo) QRCode.toDataURL(codigo, { margin: 1, width: 240 }).then(setQr)
  }, [codigo])

  if (!codigo) return null

  const copiar = async () => {
    try { await navigator.clipboard.writeText(codigo) } catch {
      const t = document.createElement('textarea'); t.value = codigo; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove()
    }
    setCopiado(true); setTimeout(() => setCopiado(false), 2500)
  }

  return (
    <section className="cartao pix nao-imprimir">
      <h3>Pagar com Pix · {dinheiro(valor)}</h3>
      {qr && <img src={qr} alt="QR Code Pix" width="200" height="200" />}
      <button className="botao principal" onClick={copiar}>{copiado ? 'Copiado! Cole no app do banco' : 'Copiar código Pix'}</button>
      <p className="dica">Abra o app do seu banco → Pix → Pix copia e cola.</p>
    </section>
  )
}
