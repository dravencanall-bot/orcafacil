import { useState } from 'react'
import { listarDocs, lerPerfil, salvarDoc } from '../lib/dados.js'
import { dinheiro, dataBR, totais } from '../lib/formato.js'
import BotaoInstalar from '../components/BotaoInstalar.jsx'
import BoasVindas from './BoasVindas.jsx'
import AvisoPlano from '../components/AvisoPlano.jsx'

export const STATUS = {
  rascunho: 'Rascunho', enviado: 'Enviado', aprovado: 'Aprovado', pago: 'Pago', recusado: 'Recusado',
}

export default function Inicio() {
  const perfil = lerPerfil()
  const [docs, setDocs] = useState(listarDocs())
  const [filtro, setFiltro] = useState('todos')

  if (!perfil.nome) return <BoasVindas logado />

  const mudarStatus = async (d, status) => {
    try { await salvarDoc({ ...d, status }) } catch (e) { alert(e.message) }
    setDocs(listarDocs())
  }

  const visiveis = docs.filter((d) => filtro === 'todos' || (filtro === 'recibo' ? d.tipo === 'recibo' : d.tipo !== 'recibo' && d.status === filtro))
  const aprovadoMes = docs
    .filter((d) => d.tipo !== 'recibo' && ['aprovado', 'pago'].includes(d.status) && (d.data || '').slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((s, d) => s + totais(d).total, 0)

  return (
    <section>
      <AvisoPlano />
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
