import { useState } from 'react'
import { lerCatalogo, salvarCatalogo, itemCatalogo, sugestoesDoHistorico, LIMITE_GRATIS_CATALOGO } from '../lib/catalogo.js'
import { dinheiro, lerNumero } from '../lib/formato.js'
import { usePro } from '../lib/pro.js'
import { avisar } from '../lib/avisos.js'
import Cadeado from '../components/Cadeado.jsx'
import Icone from '../components/Icone.jsx'

// Catálogo: serviços e materiais com preço, para montar orçamento em poucos toques.
export default function Catalogo() {
  const pro = usePro()
  const [itens, setItens] = useState(lerCatalogo)
  const [editando, setEditando] = useState(null) // item sendo editado/criado
  const [sugestoes, setSugestoes] = useState(sugestoesDoHistorico)
  const cheio = !pro && itens.length >= LIMITE_GRATIS_CATALOGO

  const gravar = async (novos, msg) => {
    setItens(novos)
    try { await salvarCatalogo(novos); if (msg) avisar(msg) } catch (e) { avisar(e.message, { tipo: 'erro' }) }
    setSugestoes(sugestoesDoHistorico())
  }
  const salvarItem = (e) => {
    e.preventDefault()
    if (!editando.desc.trim()) return
    const existe = itens.some((i) => i.id === editando.id)
    gravar(existe ? itens.map((i) => (i.id === editando.id ? editando : i)) : [...itens, editando], existe ? 'Alterado!' : 'Salvo no catálogo!')
    setEditando(null)
  }
  const apagar = (id) => gravar(itens.filter((i) => i.id !== id), 'Tirado do catálogo')
  const importar = (s) => {
    if (cheio) return
    gravar([...itens, itemCatalogo(s.desc, s.valor, s.tipo)], `“${s.desc}” salvo!`)
  }
  const importarTodos = () => {
    const vagas = pro ? sugestoes.length : Math.max(0, LIMITE_GRATIS_CATALOGO - itens.length)
    const novos = sugestoes.slice(0, vagas).map((s) => itemCatalogo(s.desc, s.valor, s.tipo))
    gravar([...itens, ...novos], `${novos.length} ${novos.length === 1 ? 'item salvo' : 'itens salvos'}!`)
  }

  const grupos = [['servico', 'Serviços'], ['material', 'Materiais e peças']].map(([t, n]) => [n, itens.filter((i) => (i.tipo || 'servico') === t)])

  return (
    <section className="pagina">
      <header className="pagina-topo">
        <div>
          <h1>Meu catálogo</h1>
          <p className="dica">Salve seus serviços com preço. No orçamento, é só tocar para adicionar.</p>
        </div>
      </header>

      {!pro && (
        <div className="faixa-limite">
          <span>Plano grátis: {Math.min(itens.length, LIMITE_GRATIS_CATALOGO)} de {LIMITE_GRATIS_CATALOGO} itens</span>
          <div className="barra-uso"><div style={{ width: `${Math.min(100, (itens.length / LIMITE_GRATIS_CATALOGO) * 100)}%` }} /></div>
        </div>
      )}

      {editando ? (
        <form className="cartao form-catalogo formulario entrar-anim" onSubmit={salvarItem}>
          <strong>{itens.some((i) => i.id === editando.id) ? 'Editar item' : 'Novo item'}</strong>
          <div className="alternar">
            {[['servico', 'Serviço'], ['material', 'Material']].map(([t, n]) => (
              <button type="button" key={t} className={editando.tipo === t ? 'ativo' : ''} onClick={() => setEditando({ ...editando, tipo: t })}>{n}</button>
            ))}
          </div>
          <label>Descrição<input value={editando.desc} onChange={(e) => setEditando({ ...editando, desc: e.target.value })} placeholder="Ex.: Instalação de chuveiro" autoFocus /></label>
          <label>Preço (R$)<input value={editando.valor} onChange={(e) => setEditando({ ...editando, valor: e.target.value })} inputMode="decimal" placeholder="Ex.: 120" /></label>
          <div className="acoes-linha">
            <button type="button" className="botao" onClick={() => setEditando(null)}>Cancelar</button>
            <button className="botao principal">Salvar</button>
          </div>
        </form>
      ) : cheio ? (
        <Cadeado recurso="catalogo" titulo="Catálogo ilimitado" texto={`No grátis cabem ${LIMITE_GRATIS_CATALOGO} itens. Com o Pro você salva todos os seus serviços e materiais.`} />
      ) : (
        <button className="botao principal grande" onClick={() => setEditando(itemCatalogo())}><Icone nome="mais" /> Adicionar serviço ou material</button>
      )}

      {itens.length === 0 && !editando && (
        <div className="vazio-bonito">
          <div className="vazio-emoji">📋</div>
          <strong>Seu catálogo está vazio</strong>
          <p>Coloque aqui o que você mais faz, com o preço. Exemplo: “Troca de tomada · R$ 60”.</p>
        </div>
      )}

      {grupos.map(([nome, lista]) => lista.length > 0 && (
        <div key={nome} className="grupo-catalogo">
          <h2 className="titulo-secao">{nome}</h2>
          <ul className="lista">
            {lista.map((i, k) => (
              <li key={i.id} className="item-catalogo surgir" style={{ '--i': k }}>
                <button className="item-catalogo-info" onClick={() => setEditando(i)}>
                  <span>{i.desc}</span>
                  <strong>{lerNumero(i.valor) ? dinheiro(lerNumero(i.valor)) : 'Sem preço'}</strong>
                </button>
                <button className="botao-icone" onClick={() => apagar(i.id)} aria-label={`Apagar ${i.desc}`}><Icone nome="lixo" tamanho={18} /></button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {sugestoes.length > 0 && !editando && (
        <div className="cartao sugestoes">
          <div className="sugestoes-topo">
            <strong>✨ Você já usou estes nos orçamentos</strong>
            {!cheio && sugestoes.length > 1 && <button className="botao-link-simples" onClick={importarTodos}>Salvar todos</button>}
          </div>
          <div className="chips">
            {sugestoes.slice(0, 12).map((s) => (
              <button key={s.desc} className="chip" onClick={() => importar(s)} disabled={cheio}>
                + {s.desc}{lerNumero(s.valor) ? ` · ${dinheiro(lerNumero(s.valor))}` : ''}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
