import { useState } from 'react'
import { listarDocs } from '../lib/dados.js'
import { dinheiro } from '../lib/formato.js'
import { resumoDoMes, ultimosMeses, mesAtual, mudarMes, nomeMes } from '../lib/resumo.js'
import { usePro } from '../lib/pro.js'
import Cadeado from '../components/Cadeado.jsx'
import Icone from '../components/Icone.jsx'

const EXEMPLO = { orcado: 8450, qtdOrcado: 14, fechado: 5320, qtdFechado: 8, recebido: 4180, qtdRecebido: 6, aReceber: 1140, qtdAReceber: 2, taxa: 57, ticket: 665, topServicos: [['Instalação de ar split', 4], ['Limpeza de ar', 3]] }
const BARRAS_EXEMPLO = [1800, 2600, 2100, 3300, 2900, 4180]

function variacao(atual, antes) {
  if (!antes) return null
  const v = Math.round(((atual - antes) / antes) * 100)
  return v
}

function Painel({ r, barras, mes, anterior }) {
  const max = Math.max(...barras.map((b) => b.recebido), 1)
  const v = variacao(r.recebido, anterior?.recebido)
  return (
    <>
      <div className="resumo-destaque">
        <span>Recebido em {nomeMes(mes)}</span>
        <strong className="contador">{dinheiro(r.recebido)}</strong>
        {v !== null && <em className={v >= 0 ? 'sobe' : 'desce'}>{v >= 0 ? '▲' : '▼'} {Math.abs(v)}% em relação a {nomeMes(mudarMes(mes, -1))}</em>}
      </div>
      <div className="resumo-cards">
        <div className="r-card azul"><span>Orçado</span><strong>{dinheiro(r.orcado)}</strong><small>{r.qtdOrcado} orçamento(s)</small></div>
        <div className="r-card amarelo"><span>Fechado</span><strong>{dinheiro(r.fechado)}</strong><small>{r.qtdFechado} aprovado(s)</small></div>
        <div className="r-card verde"><span>Taxa de fechamento</span><strong>{r.taxa}%</strong><small>dos orçamentos do mês</small></div>
        <div className="r-card roxo"><span>Valor médio</span><strong>{dinheiro(r.ticket)}</strong><small>por serviço fechado</small></div>
      </div>
      {r.aReceber > 0 && (
        <a href="#/cobrar" className="cartao a-receber">
          <span>💰 Falta receber</span>
          <strong>{dinheiro(r.aReceber)}</strong>
          <small>{r.qtdAReceber} aprovado(s) sem pagamento · Cobrar →</small>
        </a>
      )}
      <div className="cartao grafico">
        <strong>Recebido nos últimos 6 meses</strong>
        <div className="barras">
          {barras.map((b, i) => (
            <div key={b.mes} className={`barra ${b.mes === mes ? 'atual' : ''}`}>
              <span className="barra-valor">{b.recebido ? `${Math.round(b.recebido / 100) / 10}k` : ''}</span>
              <div className="barra-coluna"><div style={{ height: `${(b.recebido / max) * 100}%`, animationDelay: `${i * 70}ms` }} /></div>
              <span className="barra-mes">{nomeMes(b.mes, true)}</span>
            </div>
          ))}
        </div>
      </div>
      {r.topServicos.length > 0 && (
        <div className="cartao">
          <strong>Serviços que mais fecharam</strong>
          <ol className="top-servicos">{r.topServicos.map(([t, n]) => <li key={t}><span>{t}</span><b>{n}x</b></li>)}</ol>
        </div>
      )}
    </>
  )
}

export default function Resumo() {
  const pro = usePro()
  const [mes, setMes] = useState(mesAtual)
  const docs = listarDocs()

  if (!pro) {
    const barras = BARRAS_EXEMPLO.map((recebido, i) => ({ mes: mudarMes(mesAtual(), i - 5), recebido }))
    return (
      <section className="pagina">
        <h1>Resumo do mês</h1>
        <Cadeado recurso="resumo" texto="Veja quanto você orçou, fechou e recebeu em cada mês, e quanto ainda falta receber.">
          <Painel r={EXEMPLO} barras={barras} mes={mesAtual()} anterior={{ recebido: 2900 }} />
        </Cadeado>
      </section>
    )
  }

  const r = resumoDoMes(docs, mes)
  const ehAtual = mes === mesAtual()
  return (
    <section className="pagina">
      <div className="seletor-mes">
        <button className="botao-icone" onClick={() => setMes(mudarMes(mes, -1))} aria-label="Mês anterior"><Icone nome="voltar" /></button>
        <h1>{nomeMes(mes)} {mes.slice(0, 4)}</h1>
        <button className="botao-icone" onClick={() => setMes(mudarMes(mes, 1))} disabled={ehAtual} aria-label="Próximo mês"><Icone nome="avancar" /></button>
      </div>
      {docs.length === 0 ? (
        <div className="vazio-bonito"><div className="vazio-emoji">📊</div><strong>Ainda sem números</strong><p>Faça seus orçamentos e marque quando forem aprovados e pagos. O resumo se monta sozinho.</p></div>
      ) : (
        <Painel key={mes} r={r} barras={ultimosMeses(docs, mes)} mes={mes} anterior={resumoDoMes(docs, mudarMes(mes, -1))} />
      )}
      <p className="dica centro">Dica: marque “Aprovado” e “Pago” nos orçamentos para o resumo ficar certinho.</p>
    </section>
  )
}
