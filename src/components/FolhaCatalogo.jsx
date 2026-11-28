import { useState } from 'react'
import { lerCatalogo, salvarCatalogo, itemCatalogo, LIMITE_GRATIS_CATALOGO } from '../lib/catalogo.js'
import { dinheiro, lerNumero } from '../lib/formato.js'
import { usePro } from '../lib/pro.js'
import { avisar } from '../lib/avisos.js'
import Icone from './Icone.jsx'

// Gaveta que sobe no editor: toca no serviço e ele entra no orçamento.
export default function FolhaCatalogo({ itensDoc, aoAdicionar, fechar }) {
  const pro = usePro()
  const [catalogo, setCatalogo] = useState(lerCatalogo)
  const [busca, setBusca] = useState('')
  const [tocado, setTocado] = useState('')
  const qtdNoDoc = (desc) => itensDoc.filter((i) => i.desc === desc).reduce((s, i) => s + (lerNumero(i.qtd) || 1), 0)
  const filtrados = catalogo.filter((i) => i.desc.toLowerCase().includes(busca.trim().toLowerCase()))

  const tocar = (i) => {
    aoAdicionar(i)
    setTocado(i.id)
    setTimeout(() => setTocado(''), 400)
  }

  // Salva no catálogo o que já está digitado no orçamento.
  const novosDoDoc = itensDoc.filter((i) => i.desc.trim() && !catalogo.some((c) => c.desc.trim().toLowerCase() === i.desc.trim().toLowerCase()))
  const salvarDoDoc = async () => {
    const vagas = pro ? novosDoDoc.length : Math.max(0, LIMITE_GRATIS_CATALOGO - catalogo.length)
    if (!vagas) { location.hash = '/plano'; return }
    const novos = [...catalogo, ...novosDoDoc.slice(0, vagas).map((i) => itemCatalogo(i.desc.trim(), i.valor, i.tipo === 'material' ? 'material' : 'servico'))]
    setCatalogo(novos)
    try { await salvarCatalogo(novos); avisar('Salvo no catálogo!') } catch (e) { avisar(e.message, { tipo: 'erro' }) }
  }

  return (
    <div className="folha-fundo" onClick={fechar}>
      <div className="folha" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Meu catálogo">
        <div className="folha-alca" />
        <div className="folha-topo">
          <h2>📋 Meu catálogo</h2>
          <button type="button" className="botao principal" onClick={fechar}>Pronto</button>
        </div>
        {catalogo.length > 5 && <input className="folha-busca" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar serviço..." />}
        {catalogo.length === 0 ? (
          <div className="vazio-bonito pequeno">
            <strong>Nada salvo ainda</strong>
            <p>Salve os serviços que você mais faz e monte orçamentos em 3 toques.</p>
          </div>
        ) : (
          <ul className="folha-lista">
            {filtrados.map((i) => {
              const n = qtdNoDoc(i.desc)
              return (
                <li key={i.id}>
                  <button type="button" className={`folha-item ${tocado === i.id ? 'pulou' : ''} ${n ? 'no-doc' : ''}`} onClick={() => tocar(i)}>
                    <span className="folha-item-desc">{i.desc}<small>{i.tipo === 'material' ? 'Material' : 'Serviço'}</small></span>
                    <strong>{lerNumero(i.valor) ? dinheiro(lerNumero(i.valor)) : '—'}</strong>
                    <span className="folha-add">{n ? n : <Icone nome="mais" tamanho={18} />}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <div className="folha-rodape">
          {novosDoDoc.length > 0 && (
            <button type="button" className="botao" onClick={salvarDoDoc}><Icone nome="estrela" tamanho={18} /> Guardar {novosDoDoc.length === 1 ? 'o item' : `os ${novosDoDoc.length} itens`} deste orçamento</button>
          )}
          <a className="botao-link-simples" href="#/catalogo">Organizar catálogo</a>
        </div>
      </div>
    </div>
  )
}
