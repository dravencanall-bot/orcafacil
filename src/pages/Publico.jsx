import Documento from '../components/Documento.jsx'
import PixBox from '../components/PixBox.jsx'
import { useEffect, useState } from 'react'
import { decodificar, buscarPublico } from '../lib/dados.js'
import { dinheiro, totais, linkWhatsApp, hojeISO, somarDias, dataBR } from '../lib/formato.js'
import { EXEMPLO } from '../lib/modelos.js'
import { perfilVazio } from '../lib/dados.js'

const dadosExemplo = () => ({ doc: { ...EXEMPLO.doc, data: hojeISO() }, perfil: { ...perfilVazio, ...EXEMPLO.perfil }, pro: true })

// Página que o CLIENTE abre pelo link do WhatsApp.
// Com "exemplo", mostra um orçamento de demonstração (para quem ainda não usa o app).
export default function Publico({ codigo, id, exemplo }) {
  const [dados, setDados] = useState(() => (exemplo ? dadosExemplo() : id ? undefined : decodificar(codigo || '')))
  useEffect(() => { if (id) buscarPublico(id).then(setDados) }, [id])
  useEffect(() => {
    if (!dados?.doc) return
    const tipo = dados.doc.tipo === 'recibo' ? 'Recibo' : 'Orçamento'
    document.title = `${tipo} nº ${String(dados.doc.numero).padStart(4, '0')} · ${dados.perfil.nome || 'OrçaFechou'}`
  }, [dados])
  if (dados === undefined) return <div className="app"><main><p className="vazio">Abrindo o orçamento...</p></main></div>
  if (!dados) {
    return (
      <div className="app"><main>
        <p className="vazio">Link inválido ou incompleto. Peça para o profissional enviar de novo.</p>
      </main></div>
    )
  }
  const { doc, perfil, pro } = dados
  const recibo = doc.tipo === 'recibo'
  const { total } = totais(doc)
  const num = String(doc.numero).padStart(4, '0')

  const aprovar = linkWhatsApp(perfil.telefone, `Olá, ${perfil.nome}! Aprovo o orçamento nº ${num} no valor de ${dinheiro(total)}. Quando podemos agendar?`)
  const duvida = linkWhatsApp(perfil.telefone, `Olá, ${perfil.nome}! Tenho uma dúvida sobre o orçamento nº ${num}.`)
  const vence = !recibo && doc.validadeDias && doc.data ? somarDias(doc.data, doc.validadeDias) : null
  const vencido = vence && vence < hojeISO()

  if (exemplo) {
    return (
      <div className="app publico">
        <main>
          <div className="faixa-exemplo nao-imprimir"><strong>Exemplo.</strong> É assim que o seu cliente recebe o orçamento no WhatsApp: com sua logo, sua cor, botão de aprovar e Pix.</div>
          <Documento doc={doc} perfil={perfil} marca={false} />
          <div className="acoes nao-imprimir">
            <button className="botao whatsapp grande" onClick={() => alert('No orçamento de verdade, este botão abre o WhatsApp do profissional com a mensagem de aprovação pronta.')}>Aprovar orçamento</button>
          </div>
          <section className="cartao pix pix-exemplo nao-imprimir">
            <h3>Pagar com Pix · {dinheiro(total)}</h3>
            <p>Aqui aparece o QR Code Pix com o valor já preenchido. O dinheiro cai direto na conta do profissional.</p>
          </section>
          <a className="botao principal grande nao-imprimir" style={{ marginTop: 16 }} href="/">Quero fazer os meus orçamentos assim</a>
        </main>
      </div>
    )
  }

  return (
    <div className="app publico">
      <main>
        {vencido && <p className="validade-vencida nao-imprimir">Este orçamento venceu em {dataBR(vence)}. Os valores podem ter mudado: confirme com {perfil.nome || 'o profissional'} antes de pagar.</p>}
        <Documento doc={doc} perfil={perfil} marca={!pro} />
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
