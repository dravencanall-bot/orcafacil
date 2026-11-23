import { useState } from 'react'
import Documento from '../components/Documento.jsx'
import PixBox from '../components/PixBox.jsx'
import { pegarDoc, lerPerfil, salvarDoc, apagarDoc, linkPublico } from '../lib/dados.js'
import { dinheiro, totais, linkWhatsApp } from '../lib/formato.js'
import { ir } from '../lib/navegar.js'
import { tipoFinal } from '../lib/pix.js'
import { useConta } from '../lib/conta.js'

export default function Ver({ id }) {
  const [doc, setDoc] = useState(() => pegarDoc(id))
  const [aviso, setAviso] = useState('')
  const perfil = lerPerfil()
  const { conta } = useConta()

  if (!doc) return <p className="vazio">Documento não encontrado. <a href="#/">Voltar</a></p>

  const recibo = doc.tipo === 'recibo'
  const { total } = totais(doc)
  const link = linkPublico(doc, perfil)
  const nomeTipo = recibo ? 'recibo' : 'orçamento'
  const primeiroNome = (doc.cliente?.nome || '').split(' ')[0]

  const texto = recibo
    ? `Olá${primeiroNome ? ', ' + primeiroNome : ''}! Segue o recibo do serviço (${dinheiro(total)}):\n${link}\n\nObrigado pela confiança! — ${perfil.nome}`
    : `Olá${primeiroNome ? ', ' + primeiroNome : ''}! Segue o orçamento nº ${String(doc.numero).padStart(4, '0')} no valor de ${dinheiro(total)}.\n\nVeja os detalhes e aprove por aqui:\n${link}\n\nQualquer dúvida é só chamar. — ${perfil.nome}`

  const atualizar = (mudanca) => {
    const novo = { ...doc, ...mudanca }
    setDoc(novo)
    salvarDoc(novo).catch((e) => setAviso(e.message))
  }

  const enviar = () => {
    if (!recibo && (doc.status || 'rascunho') === 'rascunho') atualizar({ status: 'enviado' })
    window.open(linkWhatsApp(doc.cliente?.telefone, texto), '_blank')
  }

  const copiarLink = async () => {
    try { await navigator.clipboard.writeText(link); setAviso('Link copiado!') } catch { setAviso(link) }
    setTimeout(() => setAviso(''), 3000)
  }

  const apagar = () => {
    if (!confirm(`Apagar este ${nomeTipo}? Não dá para desfazer.`)) return
    apagarDoc(doc.id).then(() => ir('/')).catch((e) => setAviso(e.message))
  }

  return (
    <section>
      <div className="acoes nao-imprimir">
        <button className="botao whatsapp grande" onClick={enviar}>Enviar no WhatsApp</button>
        <div className="acoes-linha">
          <button className="botao" onClick={copiarLink}>Copiar link</button>
          <button className="botao" onClick={() => window.print()}>Baixar PDF</button>
          <a className="botao" href={`#/editar/${doc.id}`}>Editar</a>
          <a className="botao" href={`#/copiar/${doc.id}`}>Duplicar</a>
        </div>
        {!recibo && (
          <div className="acoes-linha">
            {doc.status !== 'aprovado' && doc.status !== 'pago' && <button className="botao" onClick={() => atualizar({ status: 'aprovado' })}>Marcar aprovado</button>}
            {doc.status !== 'pago' && <button className="botao" onClick={() => atualizar({ status: 'pago' })}>Marcar pago</button>}
            <a className="botao" href={`#/recibo-de/${doc.id}`}>Gerar recibo</a>
          </div>
        )}
        {aviso && <p className="aviso">{aviso}</p>}
        {perfil.pixChave && !recibo && !tipoFinal(perfil.pixChave, perfil.pixEscolha) && <p className="erro">Sua chave Pix precisa ser conferida. Abra <a href="#/perfil">Meus dados</a> e salve de novo.</p>}
        {!perfil.pixChave && !recibo && <p className="dica">Dica: cadastre sua chave Pix em <a href="#/perfil">Meus dados</a> para o cliente pagar pelo link com QR Code.</p>}
      </div>

      <Documento doc={doc} perfil={perfil} marca={!conta?.pro} />
      {!recibo && <PixBox perfil={perfil} valor={total} identificador={`ORC${doc.numero}`} />}

      <button className="botao-perigo nao-imprimir" onClick={apagar}>Apagar {nomeTipo}</button>
    </section>
  )
}
