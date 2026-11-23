import { useState } from 'react'
import { listarDocs, lerPerfil, salvarDoc } from '../lib/dados.js'
import { dinheiro, dataBR, totais } from '../lib/formato.js'
import BotaoInstalar from '../components/BotaoInstalar.jsx'

export const STATUS = {
  rascunho: 'Rascunho', enviado: 'Enviado', aprovado: 'Aprovado', pago: 'Pago', recusado: 'Recusado',
}

export default function Inicio() {
  const perfil = lerPerfil()
  const [docs, setDocs] = useState(listarDocs())
  const [filtro, setFiltro] = useState('todos')

  if (!perfil.nome) {
    return (
      <section className="boas-vindas">
        <span className="selo">Grátis · Sem anúncios</span>
        <h1>Orçamento profissional<br />em 1 minuto</h1>
        <p className="lead">Monte o orçamento no celular, mande pelo WhatsApp e receba por Pix. Para eletricista, pintor, encanador, diarista e todo autônomo.</p>
        <a className="botao principal grande" href="#/perfil/x/novo">Fazer meu primeiro orçamento</a>
        <ol className="passos">
          <li><strong>Preencha seus dados</strong><span>Nome, WhatsApp, logo e chave Pix. Só uma vez.</span></li>
          <li><strong>Monte o orçamento</strong><span>Serviços, valores e desconto. O total sai sozinho.</span></li>
          <li><strong>Mande pelo WhatsApp</strong><span>O cliente abre o link, aprova e paga pelo QR Code Pix.</span></li>
        </ol>
        <ul className="vantagens">
          <li>✓ Cara de empresa: sua logo e sua cor no orçamento</li>
          <li>✓ Pix com o valor já preenchido, direto na sua conta</li>
          <li>✓ Recibo com valor por extenso e PDF</li>
          <li>✓ Controle do que foi aprovado e pago no mês</li>
        </ul>
        <BotaoInstalar />
      </section>
    )
  }

  const mudarStatus = (d, status) => {
    salvarDoc({ ...d, status })
    setDocs(listarDocs())
  }

  const visiveis = docs.filter((d) => filtro === 'todos' || (filtro === 'recibo' ? d.tipo === 'recibo' : d.tipo !== 'recibo' && d.status === filtro))
  const aprovadoMes = docs
    .filter((d) => d.tipo !== 'recibo' && ['aprovado', 'pago'].includes(d.status) && (d.data || '').slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((s, d) => s + totais(d).total, 0)

  return (
    <section>
      <div className="acoes-topo">
        <a className="botao principal grande" href="#/novo">+ Novo orçamento</a>
        <a className="botao" href="#/novo/recibo">+ Recibo</a>
      </div>

      {docs.length > 0 && (
        <div className="resumo">
          <div><span>Aprovado este mês</span><strong>{dinheiro(aprovadoMes)}</strong></div>
          <div><span>Documentos</span><strong>{docs.length}</strong></div>
        </div>
      )}

      {docs.length > 0 && (
        <div className="filtros">
          {['todos', 'enviado', 'aprovado', 'pago', 'recibo'].map((f) => (
            <button key={f} className={filtro === f ? 'ativo' : ''} onClick={() => setFiltro(f)}>
              {f === 'todos' ? 'Todos' : f === 'recibo' ? 'Recibos' : STATUS[f]}
            </button>
          ))}
        </div>
      )}

      {docs.length === 0 && (
        <div className="vazio">
          <p><strong>Tudo pronto, {perfil.nome.split(' ')[0]}!</strong></p>
          <p>Toque em “Novo orçamento” para fazer o primeiro. Dica: mande um pra você mesmo para ver como o cliente recebe.</p>
        </div>
      )}
      <div className="rodape-inicio"><BotaoInstalar /></div>

      <ul className="lista">
        {visiveis.map((d) => (
          <li key={d.id} className="item-lista">
            <a href={`#/ver/${d.id}`} className="item-principal">
              <div>
                <strong>{d.cliente?.nome || 'Sem nome'}</strong>
                <div className="sub">
                  {d.tipo === 'recibo' ? 'Recibo' : 'Orçamento'} nº {String(d.numero).padStart(4, '0')} · {dataBR(d.data)}
                </div>
              </div>
              <strong>{dinheiro(totais(d).total)}</strong>
            </a>
            {d.tipo !== 'recibo' && (
              <select value={d.status || 'rascunho'} onChange={(e) => mudarStatus(d, e.target.value)} className={`status status-${d.status || 'rascunho'}`} aria-label="Situação">
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
