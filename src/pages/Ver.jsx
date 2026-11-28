import { useEffect, useState } from 'react'
import Documento from '../components/Documento.jsx'
import PixBox from '../components/PixBox.jsx'
import { pegarDoc, lerPerfil, salvarDoc, apagarDoc, linkPublico, comStatus } from '../lib/dados.js'
import { usePro } from '../lib/pro.js'
import { useAberturas, marcarVisto } from '../lib/aberturas.js'
import { avisar, tempoAtras } from '../lib/avisos.js'
import { mensagemCobranca } from '../lib/cobranca.js'
import { nuvemAtiva } from '../lib/supabase.js'
import { soltarConfete } from '../components/Confete.jsx'
import { dinheiro, totais, linkWhatsApp } from '../lib/formato.js'
import { ir } from '../lib/navegar.js'
import { tipoFinal } from '../lib/pix.js'
import { useConta } from '../lib/conta.js'

export default function Ver({ id }) {
  const [doc, setDoc] = useState(() => pegarDoc(id))
  const [aviso, setAviso] = useState('')
  const perfil = lerPerfil()
  const { conta } = useConta()
  const pro = usePro()
  const { mapa, bloqueado, pronto } = useAberturas()
  const visto = mapa[id]
  useEffect(() => { if (visto) marcarVisto(id) }, [id, visto])

  if (!doc) return <p className="vazio">Documento não encontrado. <a href="#/">Voltar</a></p>

  const recibo = doc.tipo === 'recibo'
  const { total } = totais(doc)
  const link = linkPublico(doc, perfil)
  const nomeTipo = recibo ? 'recibo' : 'orçamento'
  const primeiroNome = (doc.cliente?.nome || '').split(' ')[0]

  const texto = recibo
    ? `Olá${primeiroNome ? ', ' + primeiroNome : ''}! Segue o recibo do serviço (${dinheiro(total)}):\n${link}\n\nObrigado pela confiança! — ${perfil.nome}`
    : `Olá${primeiroNome ? ', ' + primeiroNome : ''}! Segue o orçamento nº ${String(doc.numero).padStart(4, '0')} no valor de ${dinheiro(total)}.\n\nVeja os detalhes e aprove por aqui:\n${link}\n\nQualquer dúvida é só chamar. — ${perfil.nome}`

  const mudarStatus = (status) => {
    const novo = comStatus(doc, status)
    setDoc(novo)
    salvarDoc(novo).catch((e) => setAviso(e.message))
    if (status === 'pago') { soltarConfete(); avisar(`💸 ${dinheiro(total)} no bolso!`) }
    if (status === 'aprovado') avisar('Fechou! 🤝 Agora é só receber.')
  }

  const enviar = () => {
    if (!recibo && (doc.status || 'rascunho') === 'rascunho') mudarStatus('enviado')
    window.open(linkWhatsApp(doc.cliente?.telefone, texto), '_blank')
  }

  const cobrar = () => {
    if (!pro) { location.hash = '/plano'; return }
    window.open(linkWhatsApp(doc.cliente?.telefone, mensagemCobranca(doc, perfil, link)), '_blank')
    const novo = { ...doc, cobradoEm: new Date().toISOString(), cobrancas: (doc.cobrancas || 0) + 1 }
    setDoc(novo)
    salvarDoc(novo).catch(() => {})
  }

  const copiarLink = async () => {
    try { await navigator.clipboard.writeText(link); avisar('Link copiado!') } catch { setAviso(link) }
  }

  const apagar = () => {
    if (!confirm(`Apagar este ${nomeTipo}? Não dá para desfazer.`)) return
    apagarDoc(doc.id).then(() => ir('/')).catch((e) => setAviso(e.message))
  }

  return (
    <section className="pagina">
      <div className="acoes nao-imprimir">
        {!recibo && nuvemAtiva && pronto && (doc.status || 'rascunho') !== 'rascunho' && (
          pro ? (
            <div className={`faixa-visto ${visto ? 'sim' : ''}`}>
              <span className="olhinho">👀</span>
              {visto ? <span><strong>O cliente abriu {visto.vezes === 1 ? '1 vez' : `${visto.vezes} vezes`}</strong> · última {tempoAtras(visto.ultima)}</span>
                : <span>O cliente ainda não abriu o link.</span>}
            </div>
          ) : bloqueado && (
            <a href="#/plano" className="faixa-visto travada"><span className="olhinho">🔒</span><span>Quer saber se o cliente já abriu? <strong>Seja Pro</strong></span></a>
          )
        )}
        {!recibo && doc.status === 'aprovado' ? (
          <button className="botao dourado grande" onClick={cobrar}>💰 Cobrar no WhatsApp {!pro && '🔒'}</button>
        ) : (
          <button className="botao whatsapp grande" onClick={enviar}>Enviar no WhatsApp</button>
        )}
        <div className="acoes-linha">
          <button className="botao" onClick={copiarLink}>Copiar link</button>
          <button className="botao" onClick={() => window.print()}>Baixar PDF</button>
          <a className="botao" href={`#/editar/${doc.id}`}>Editar</a>
          <a className="botao" href={`#/copiar/${doc.id}`}>Duplicar</a>
        </div>
        {!recibo && (
          <div className="acoes-linha">
            {doc.status !== 'aprovado' && doc.status !== 'pago' && <button className="botao" onClick={() => mudarStatus('aprovado')}>🤝 Marcar aprovado</button>}
            {doc.status !== 'pago' && <button className="botao" onClick={() => mudarStatus('pago')}>💸 Marcar pago</button>}
            {doc.status === 'aprovado' && <button className="botao" onClick={enviar}>Reenviar link</button>}
            <a className="botao" href={`#/recibo-de/${doc.id}`}>Gerar recibo</a>
          </div>
        )}
        {aviso && <p className="aviso">{aviso}</p>}
        {perfil.pixChave && !recibo && !tipoFinal(perfil.pixChave, perfil.pixEscolha) && <p className="erro">Sua chave Pix precisa ser conferida. Abra <a href="#/perfil">Meus dados</a> e salve de novo.</p>}
        {!perfil.pixChave && !recibo && <p className="dica">Dica: cadastre sua chave Pix em <a href="#/perfil">Meus dados</a> para o cliente pagar pelo link com QR Code.</p>}
      </div>

      <Documento doc={doc} perfil={perfil} marca={!conta?.pro} pro={pro} />
      {!recibo && <PixBox perfil={perfil} valor={total} identificador={`ORC${doc.numero}`} />}

      <button className="botao-perigo nao-imprimir" onClick={apagar}>Apagar {nomeTipo}</button>
    </section>
  )
}
