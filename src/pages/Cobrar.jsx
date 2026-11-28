import { useState } from 'react'
import { listarDocs, lerPerfil, salvarDoc, linkPublico, comStatus } from '../lib/dados.js'
import { dinheiro, totais, linkWhatsApp } from '../lib/formato.js'
import { paraCobrar, mensagemCobranca, mensagemLembrete, TONS } from '../lib/cobranca.js'
import { usePro } from '../lib/pro.js'
import { avisar, tempoAtras } from '../lib/avisos.js'
import { useAberturas } from '../lib/aberturas.js'
import { soltarConfete } from '../components/Confete.jsx'
import Cadeado from '../components/Cadeado.jsx'

const dias = (n) => (n <= 0 ? 'hoje' : n === 1 ? 'há 1 dia' : `há ${n} dias`)

function Linha({ item, perfil, modo, pro, aoMudar, visto }) {
  const [tom, setTom] = useState('gentil')
  const d = item.doc
  const link = linkPublico(d, perfil)
  const texto = modo === 'cobrar' ? mensagemCobranca(d, perfil, link, tom) : mensagemLembrete(d, perfil, link)

  const enviar = async () => {
    if (!pro) { location.hash = '/plano'; return }
    window.open(linkWhatsApp(d.cliente?.telefone, texto), '_blank')
    const novo = { ...d, cobradoEm: new Date().toISOString(), cobrancas: (d.cobrancas || 0) + 1 }
    await salvarDoc(novo).catch(() => {})
    aoMudar()
  }
  const pago = async () => {
    await salvarDoc(comStatus(d, 'pago')).catch((e) => avisar(e.message, { tipo: 'erro' }))
    soltarConfete()
    avisar(`💸 ${dinheiro(totais(d).total)} no bolso!`)
    aoMudar()
  }

  return (
    <li className="cobranca surgir">
      <div className="cobranca-topo">
        <div>
          <strong>{d.cliente?.nome || 'Sem nome'}</strong>
          <div className="sub">
            Nº {String(d.numero).padStart(4, '0')} · {modo === 'cobrar' ? `aprovado ${dias(item.dias)}` : `enviado ${dias(item.dias)}`}
            {d.cobradoEm && ` · lembrado ${tempoAtras(d.cobradoEm)}`}
          </div>
          {visto && <div className="visto"><span className="olhinho">👀</span> abriu {visto.vezes}x · {tempoAtras(visto.ultima)}</div>}
        </div>
        <strong className="cobranca-valor">{dinheiro(totais(d).total)}</strong>
      </div>
      {modo === 'cobrar' && (
        <div className="alternar pequeno">
          {Object.entries(TONS).map(([k, v]) => <button key={k} className={tom === k ? 'ativo' : ''} onClick={() => setTom(k)}>{v}</button>)}
        </div>
      )}
      <details className="previa-msg">
        <summary>Ver a mensagem</summary>
        <p>{texto}</p>
      </details>
      <div className="acoes-linha">
        <button className="botao whatsapp" onClick={enviar}>{modo === 'cobrar' ? 'Cobrar no WhatsApp' : 'Lembrar no WhatsApp'}</button>
        {modo === 'cobrar' && <button className="botao" onClick={pago}>Já pagou ✓</button>}
      </div>
      {!d.cliente?.telefone && <p className="dica">Sem WhatsApp do cliente: o app vai pedir para você escolher o contato.</p>}
    </li>
  )
}

export default function Cobrar() {
  const pro = usePro()
  const perfil = lerPerfil()
  const [, setVersao] = useState(0)
  const { mapa } = useAberturas()
  const { cobrar, lembrar, totalCobrar } = paraCobrar(listarDocs())
  const atualizar = () => setVersao((v) => v + 1)
  const nada = !cobrar.length && !lembrar.length

  const conteudo = (
    <>
      {cobrar.length > 0 && (
        <>
          <h2 className="titulo-secao">💰 Aprovados esperando pagamento</h2>
          <ul className="lista">{cobrar.map((c) => <Linha key={c.doc.id} item={c} perfil={perfil} modo="cobrar" pro={pro} aoMudar={atualizar} visto={pro && mapa[c.doc.id]} />)}</ul>
        </>
      )}
      {lembrar.length > 0 && (
        <>
          <h2 className="titulo-secao">⏰ Enviados sem resposta</h2>
          <p className="dica">Cliente que recebe um lembrete educado fecha bem mais.</p>
          <ul className="lista">{lembrar.map((c) => <Linha key={c.doc.id} item={c} perfil={perfil} modo="lembrar" pro={pro} aoMudar={atualizar} visto={pro && mapa[c.doc.id]} />)}</ul>
        </>
      )}
    </>
  )

  return (
    <section className="pagina">
      <h1>Cobrar e lembrar</h1>
      {nada ? (
        <div className="vazio-bonito">
          <div className="vazio-emoji">🎉</div>
          <strong>Ninguém para cobrar agora</strong>
          <p>Quando um orçamento for aprovado e ainda não estiver pago, ele aparece aqui com a mensagem de cobrança pronta, com o seu Pix.</p>
        </div>
      ) : (
        <>
          <div className="resumo-destaque laranja">
            <span>Para receber</span>
            <strong>{dinheiro(totalCobrar)}</strong>
            <em>{cobrar.length} aprovado(s) sem pagamento · {lembrar.length} esperando resposta</em>
          </div>
          {!perfil.pixChave && <p className="aviso-plano alerta">Cadastre sua chave Pix em <a href="#/perfil">Meus dados</a> para ela ir junto na cobrança.</p>}
          {pro ? conteudo : (
            <Cadeado recurso="cobrar" texto="A mensagem de cobrança vem pronta, educada e com o seu Pix. Você só toca em enviar.">{conteudo}</Cadeado>
          )}
        </>
      )}
    </section>
  )
}
