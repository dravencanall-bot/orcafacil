import { useState } from 'react'
import { listarDocs, lerPerfil, salvarDoc, comStatus } from '../lib/dados.js'
import { dinheiro, dataBR, totais } from '../lib/formato.js'
import { resumoDoMes, mesAtual } from '../lib/resumo.js'
import { paraCobrar } from '../lib/cobranca.js'
import { lerCatalogo } from '../lib/catalogo.js'
import { useAberturas } from '../lib/aberturas.js'
import { avisar, tempoAtras } from '../lib/avisos.js'
import { usePro } from '../lib/pro.js'
import { jaInstalado } from '../lib/instalar.js'
import BotaoInstalar from '../components/BotaoInstalar.jsx'
import BoasVindas from './BoasVindas.jsx'
import AvisoPlano from '../components/AvisoPlano.jsx'
import Icone from '../components/Icone.jsx'
import { soltarConfete } from '../components/Confete.jsx'

export const STATUS = {
  rascunho: 'Rascunho', enviado: 'Enviado', aprovado: 'Aprovado', pago: 'Pago', recusado: 'Recusado',
}

const CORES_AVATAR = ['#0f766e', '#1d4ed8', '#c2410c', '#7c3aed', '#be185d', '#15803d', '#b45309']
const corDoNome = (n = '') => CORES_AVATAR[[...n].reduce((s, c) => s + c.charCodeAt(0), 0) % CORES_AVATAR.length]
const iniciais = (n = '') => n.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?'

function saudacao() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

// Lista de primeiros passos (some quando tudo estiver feito).
function PrimeirosPassos({ perfil, docs }) {
  const [fechado, setFechado] = useState(() => { try { return localStorage.getItem('of_passos_ok') === '1' } catch { return false } })
  const passos = [
    { feito: !!perfil.nome, texto: 'Preencher seus dados', href: '#/perfil' },
    { feito: !!perfil.pixChave, texto: 'Cadastrar sua chave Pix', href: '#/perfil' },
    { feito: docs.some((d) => d.tipo !== 'recibo'), texto: 'Fazer o primeiro orçamento', href: '#/novo' },
    { feito: docs.some((d) => d.status && d.status !== 'rascunho'), texto: 'Mandar no WhatsApp (pode ser pra você mesmo)', href: docs[0] ? `#/ver/${docs[0].id}` : '#/novo' },
    { feito: lerCatalogo().length > 0, texto: 'Salvar um serviço no catálogo', href: '#/catalogo' },
    { feito: jaInstalado(), texto: 'Instalar o app no celular', href: null },
  ]
  const feitos = passos.filter((p) => p.feito).length
  if (fechado || feitos === passos.length) return null
  return (
    <div className="cartao primeiros-passos surgir">
      <div className="pp-topo">
        <strong>🚀 Primeiros passos</strong>
        <span>{feitos} de {passos.length}</span>
      </div>
      <div className="barra-uso"><div style={{ width: `${(feitos / passos.length) * 100}%` }} /></div>
      <ul>
        {passos.map((p) => (
          <li key={p.texto} className={p.feito ? 'feito' : ''}>
            {p.href && !p.feito ? <a href={p.href}><span className="pp-bola" />{p.texto}<Icone nome="avancar" tamanho={16} /></a>
              : <span><span className="pp-bola">{p.feito && <Icone nome="check" tamanho={14} />}</span>{p.texto}</span>}
          </li>
        ))}
      </ul>
      <button className="botao-link-simples" onClick={() => { try { localStorage.setItem('of_passos_ok', '1') } catch { /* */ } setFechado(true) }}>Esconder</button>
    </div>
  )
}

export default function Inicio() {
  const perfil = lerPerfil()
  const pro = usePro()
  const [docs, setDocs] = useState(listarDocs())
  const [filtro, setFiltro] = useState('todos')
  const { mapa } = useAberturas()

  if (!perfil.nome) return <BoasVindas logado />

  const mudarStatus = async (d, status) => {
    try { await salvarDoc(comStatus(d, status)) } catch (e) { avisar(e.message, { tipo: 'erro' }) }
    if (status === 'pago') { soltarConfete(); avisar(`💸 ${dinheiro(totais(d).total)} no bolso!`) }
    if (status === 'aprovado') avisar('Fechou! 🤝', { acao: { texto: 'Cobrar depois', href: '#/cobrar' } })
    setDocs(listarDocs())
  }

  const visiveis = docs.filter((d) => filtro === 'todos' || (filtro === 'recibo' ? d.tipo === 'recibo' : d.tipo !== 'recibo' && d.status === filtro))
  const r = resumoDoMes(docs, mesAtual())
  const { cobrar, lembrar, totalCobrar } = paraCobrar(docs)

  return (
    <section className="pagina">
      <div className="ola">
        <div>
          <span>{saudacao()},</span>
          <h1>{perfil.nome.split(' ')[0]} 👋</h1>
        </div>
        <a href="#/perfil" className="avatar-perfil" aria-label="Meus dados">
          {pro && perfil.logo ? <img src={perfil.logo} alt="" /> : <span style={{ background: perfil.cor || '#0f766e' }}>{iniciais(perfil.nome)}</span>}
        </a>
      </div>
      <AvisoPlano />

      <a href="#/resumo" className="hero-mes">
        <div>
          <span>Fechado em {new Date().toLocaleDateString('pt-BR', { month: 'long' })}</span>
          <strong>{dinheiro(r.fechado)}</strong>
          <small>{r.qtdFechado} serviço(s) · recebido {dinheiro(r.recebido)}</small>
        </div>
        <span className="hero-link">Ver resumo {pro ? '→' : '🔒'}</span>
      </a>

      {(cobrar.length > 0 || lembrar.length > 0) && (
        <a href="#/cobrar" className="cartao-cobrar surgir">
          <span className="cartao-cobrar-icone">💰</span>
          <span>
            {cobrar.length > 0
              ? <><strong>{dinheiro(totalCobrar)} para receber</strong><small>{cobrar.length} cliente(s) aprovaram e ainda não pagaram</small></>
              : <><strong>{lembrar.length} orçamento(s) sem resposta</strong><small>Mande um lembrete e feche mais</small></>}
          </span>
          <Icone nome="avancar" />
        </a>
      )}

      <PrimeirosPassos perfil={perfil} docs={docs} />

      <div className="acoes-topo">
        <a className="botao principal grande brilho" href="#/novo"><Icone nome="mais" /> Novo orçamento</a>
        <a className="botao grande" href="#/novo/recibo"><Icone nome="recibo" /> Recibo</a>
      </div>

      {docs.length > 0 && (
        <div className="filtros">
          {['todos', 'enviado', 'aprovado', 'pago', 'recibo'].map((f) => (
            <button key={f} className={filtro === f ? 'ativo' : ''} onClick={() => setFiltro(f)}>
              {f === 'todos' ? `Todos · ${docs.length}` : f === 'recibo' ? 'Recibos' : STATUS[f]}
            </button>
          ))}
        </div>
      )}

      {docs.length === 0 && (
        <div className="vazio-bonito">
          <svg width="120" height="100" viewBox="0 0 120 100" aria-hidden="true" className="vazio-desenho">
            <rect x="28" y="10" width="64" height="80" rx="8" fill="#fff" stroke="#99f6e4" strokeWidth="3" />
            <rect x="40" y="26" width="40" height="6" rx="3" fill="#5eead4" />
            <rect x="40" y="40" width="30" height="5" rx="2.5" fill="#e2e8f0" />
            <rect x="40" y="52" width="36" height="5" rx="2.5" fill="#e2e8f0" />
            <rect x="40" y="70" width="22" height="8" rx="4" fill="#0f766e" />
            <circle cx="92" cy="76" r="16" fill="#16a34a" /><path d="M85 76l5 5 9-10" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <strong>Tudo pronto, {perfil.nome.split(' ')[0]}!</strong>
          <p>Toque em “Novo orçamento” para fazer o primeiro. Dica: mande pra você mesmo para ver como o cliente recebe.</p>
        </div>
      )}
      <BotaoInstalar podeFechar />

      {docs.length > 0 && visiveis.length === 0 && <p className="vazio">Nada aqui por enquanto.</p>}
      <ul className="lista">
        {visiveis.map((d, k) => {
          const visto = pro && mapa[d.id]
          return (
            <li key={d.id} className="item-lista surgir" style={{ '--i': Math.min(k, 10) }}>
              <a href={`#/ver/${d.id}`} className="item-principal">
                <span className="avatar" style={{ background: d.tipo === 'recibo' ? '#64748b' : corDoNome(d.cliente?.nome) }}>
                  {d.tipo === 'recibo' ? <Icone nome="recibo" tamanho={18} /> : iniciais(d.cliente?.nome)}
                </span>
                <div className="item-meio">
                  <strong>{d.cliente?.nome || 'Sem nome'}</strong>
                  <div className="sub">
                    {d.tipo === 'recibo' ? 'Recibo' : 'Nº'} {String(d.numero).padStart(4, '0')} · {dataBR(d.data).slice(0, 5)}
                  </div>
                  {visto && <div className="visto">👀 abriu {tempoAtras(visto.ultima)}</div>}
                </div>
                <strong className="item-valor">{dinheiro(totais(d).total)}</strong>
              </a>
              {d.tipo !== 'recibo' && (
                <select value={d.status || 'rascunho'} onChange={(e) => mudarStatus(d, e.target.value)} className={`status status-${d.status || 'rascunho'}`} aria-label="Situação">
                  {Object.entries(STATUS).map(([k2, v]) => <option key={k2} value={k2}>{v}</option>)}
                </select>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
