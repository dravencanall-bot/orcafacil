import { useState } from 'react'
import { listarDocs, lerPerfil, salvarDoc } from '../lib/dados.js'
import { dinheiro, dataBR, totais } from '../lib/formato.js'

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
        <h1>Orçamento profissional em 1 minuto</h1>
        <p>Monte o orçamento, mande pelo WhatsApp e receba por Pix. Sem anúncios.</p>
        <a className="botao principal grande" href="#/perfil/x/novo">Começar: preencher meus dados</a>
        <ul className="vantagens">
          <li>✓ Link para o cliente abrir no celular e aprovar</li>
          <li>✓ QR Code Pix com o valor já preenchido</li>
          <li>✓ PDF e recibo com valor por extenso</li>
        </ul>
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

      {docs.length === 0 && <p className="vazio">Nenhum orçamento ainda. Toque em “Novo orçamento” para fazer o primeiro.</p>}

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
