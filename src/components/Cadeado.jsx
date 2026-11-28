import { RECURSOS_PRO } from '../lib/pro.js'
import Icone from './Icone.jsx'

// Convite para o Pro no lugar de um recurso bloqueado.
// "por cima": aparece sobre uma prévia borrada (o conteúdo de verdade vai em children).
export default function Cadeado({ recurso, titulo, texto, children, compacto = false }) {
  const r = RECURSOS_PRO.find((x) => x.id === recurso) || {}
  const cartao = (
    <div className={`cadeado ${compacto ? 'compacto' : ''}`}>
      <div className="cadeado-icone"><Icone nome="cadeado" tamanho={compacto ? 18 : 26} /></div>
      <div className="cadeado-texto">
        <span className="selo-pro pequeno">PRO</span>
        <strong>{titulo || `${r.icone || ''} ${r.titulo || ''}`}</strong>
        {!compacto && <p>{texto || r.texto}</p>}
      </div>
      <a className="botao dourado" href="#/plano">{compacto ? 'Liberar' : 'Liberar com o Pro'}</a>
    </div>
  )
  if (!children) return cartao
  return (
    <div className="bloqueado">
      <div className="bloqueado-previa" aria-hidden="true">{children}</div>
      <div className="bloqueado-capa">{cartao}</div>
    </div>
  )
}
