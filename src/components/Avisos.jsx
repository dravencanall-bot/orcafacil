import { useAvisos, fecharAviso, tempoAtras } from '../lib/avisos.js'
import { useAberturas, marcarVisto } from '../lib/aberturas.js'
import { pegarDoc } from '../lib/dados.js'
import Icone from './Icone.jsx'

// Mensagens rápidas embaixo + aviso "o cliente abriu seu orçamento" em cima.
export default function Avisos() {
  const avisos = useAvisos()
  const { novas } = useAberturas()
  const abertura = novas[0]
  const doc = abertura && !abertura.bloqueado ? pegarDoc(abertura.doc) : null

  return (
    <>
      {abertura && (abertura.bloqueado || doc) && (
        <div className="notif-abertura" role="status" key={abertura.doc || 'gratis'}>
          <div className="notif-olho"><Icone nome="olho" /></div>
          {abertura.bloqueado ? (
            <a href="#/plano" className="notif-texto" onClick={() => marcarVisto('gratis')}>
              <strong>Um cliente abriu seu orçamento {tempoAtras(abertura.ultima)}!</strong>
              <span>Quer saber quem foi? Seja Pro 🔒</span>
            </a>
          ) : (
            <a href={`#/ver/${doc.id}`} className="notif-texto" onClick={() => marcarVisto(doc.id)}>
              <strong>{doc.cliente?.nome || 'Seu cliente'} abriu o orçamento {tempoAtras(abertura.ultima)}</strong>
              <span>Bom momento para chamar no WhatsApp 👉</span>
            </a>
          )}
          <button className="notif-fechar" onClick={() => marcarVisto(abertura.bloqueado ? 'gratis' : abertura.doc)} aria-label="Fechar">×</button>
        </div>
      )}
      <div className="avisos" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={`aviso-rapido ${a.tipo}`} onClick={() => fecharAviso(a.id)}>
            {a.tipo === 'ok' && <Icone nome="check" tamanho={18} />}
            <span>{a.texto}</span>
            {a.acao && <a href={a.acao.href} onClick={(e) => { e.stopPropagation(); fecharAviso(a.id) }}>{a.acao.texto}</a>}
          </div>
        ))}
      </div>
    </>
  )
}
