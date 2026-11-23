import Documento from '../components/Documento.jsx'
import PixBox from '../components/PixBox.jsx'
import { decodificar } from '../lib/dados.js'
import { dinheiro, totais, linkWhatsApp } from '../lib/formato.js'

// Página que o CLIENTE abre pelo link do WhatsApp.
export default function Publico({ codigo }) {
  const dados = decodificar(codigo || '')
  if (!dados) {
    return (
      <div className="app"><main>
        <p className="vazio">Link inválido ou incompleto. Peça para o profissional enviar de novo.</p>
      </main></div>
    )
  }
  const { doc, perfil } = dados
  const recibo = doc.tipo === 'recibo'
  const { total } = totais(doc)
  const num = String(doc.numero).padStart(4, '0')

  const aprovar = linkWhatsApp(perfil.telefone, `Olá, ${perfil.nome}! Aprovo o orçamento nº ${num} no valor de ${dinheiro(total)}. Quando podemos agendar?`)
  const duvida = linkWhatsApp(perfil.telefone, `Olá, ${perfil.nome}! Tenho uma dúvida sobre o orçamento nº ${num}.`)

  return (
    <div className="app publico">
      <main>
        <Documento doc={doc} perfil={perfil} />
        {!recibo && perfil.telefone && (
          <div className="acoes nao-imprimir">
            <a className="botao whatsapp grande" href={aprovar} target="_blank" rel="noreferrer">Aprovar orçamento</a>
            <div className="acoes-linha">
              <a className="botao" href={duvida} target="_blank" rel="noreferrer">Tirar dúvida</a>
              <button className="botao" onClick={() => window.print()}>Baixar PDF</button>
            </div>
          </div>
        )}
        {recibo && <div className="acoes nao-imprimir"><button className="botao" onClick={() => window.print()}>Baixar PDF</button></div>}
        {!recibo && <PixBox perfil={perfil} valor={total} identificador={`ORC${doc.numero}`} />}
        <a className="propaganda nao-imprimir" href="/">
          Você é profissional autônomo? <strong>Faça orçamentos assim de graça →</strong>
        </a>
      </main>
    </div>
  )
}
