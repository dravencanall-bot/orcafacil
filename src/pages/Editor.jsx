import { useState } from 'react'
import { pegarDoc, salvarDoc, novoId, proximoNumero } from '../lib/dados.js'
import { dinheiro, hojeISO, totais, lerNumero } from '../lib/formato.js'
import { ir } from '../lib/navegar.js'

const itemVazio = () => ({ desc: '', qtd: '1', valor: '' })

function docNovo(tipo) {
  return {
    id: novoId(), tipo, numero: proximoNumero(), data: hojeISO(), criadoEm: new Date().toISOString(),
    validadeDias: 15, cliente: { nome: '', telefone: '', endereco: '' },
    itens: [itemVazio()], desconto: '', pagamento: tipo === 'recibo' ? 'Pix' : '50% no início e 50% na entrega, via Pix',
    obs: '', status: 'rascunho',
  }
}

export default function Editor({ id, tipo = 'orcamento', deOrcamento }) {
  const [doc, setDoc] = useState(() => {
    if (id) return pegarDoc(id) || docNovo(tipo)
    if (deOrcamento) {
      const o = pegarDoc(deOrcamento)
      if (o) return { ...docNovo('recibo'), cliente: o.cliente, itens: o.itens, desconto: o.desconto, origem: o.id }
    }
    return docNovo(tipo)
  })
  const [erro, setErro] = useState('')
  const recibo = doc.tipo === 'recibo'

  const set = (campo, valor) => setDoc((d) => ({ ...d, [campo]: valor }))
  const setCliente = (campo, valor) => setDoc((d) => ({ ...d, cliente: { ...d.cliente, [campo]: valor } }))
  const setItem = (k, campo, valor) => setDoc((d) => ({ ...d, itens: d.itens.map((i, j) => (j === k ? { ...i, [campo]: valor } : i)) }))
  const addItem = () => setDoc((d) => ({ ...d, itens: [...d.itens, itemVazio()] }))
  const tirarItem = (k) => setDoc((d) => ({ ...d, itens: d.itens.length > 1 ? d.itens.filter((_, j) => j !== k) : [itemVazio()] }))

  const { total } = totais(doc)

  const salvar = (e) => {
    e.preventDefault()
    if (!doc.cliente.nome.trim()) return setErro('Coloque o nome do cliente.')
    if (!doc.itens.some((i) => i.desc.trim() && lerNumero(i.valor) > 0)) return setErro('Adicione pelo menos um serviço com valor.')
    salvarDoc(doc)
    ir(`/ver/${doc.id}`)
  }

  return (
    <form onSubmit={salvar} className="formulario">
      <h1>{id ? 'Editar' : 'Novo'} {recibo ? 'recibo' : 'orçamento'}</h1>

      <fieldset>
        <legend>Cliente</legend>
        <label>Nome do cliente*<input value={doc.cliente.nome} onChange={(e) => setCliente('nome', e.target.value)} placeholder="Ex.: Dona Maria" autoFocus={!id} /></label>
        <label>WhatsApp do cliente<input value={doc.cliente.telefone} onChange={(e) => setCliente('telefone', e.target.value)} placeholder="(11) 98888-7777" inputMode="tel" /></label>
        <label>Endereço do serviço<input value={doc.cliente.endereco} onChange={(e) => setCliente('endereco', e.target.value)} placeholder="Rua, número, bairro" /></label>
      </fieldset>

      <fieldset>
        <legend>Serviços e materiais</legend>
        {doc.itens.map((i, k) => (
          <div key={k} className="linha-item">
            <input className="item-desc" value={i.desc} onChange={(e) => setItem(k, 'desc', e.target.value)} placeholder="Ex.: Troca de disjuntor" aria-label="Descrição" />
            <input className="item-qtd" value={i.qtd} onChange={(e) => setItem(k, 'qtd', e.target.value)} inputMode="decimal" aria-label="Quantidade" placeholder="Qtd" />
            <input className="item-valor" value={i.valor} onChange={(e) => setItem(k, 'valor', e.target.value)} inputMode="decimal" aria-label="Valor unitário" placeholder="R$ 0,00" />
            <button type="button" className="botao-x" onClick={() => tirarItem(k)} aria-label="Remover item">×</button>
          </div>
        ))}
        <button type="button" className="botao" onClick={addItem}>+ Adicionar item</button>
        <label className="curto">Desconto (R$)<input value={doc.desconto} onChange={(e) => set('desconto', e.target.value)} inputMode="decimal" placeholder="0,00" /></label>
        <div className="total-ao-vivo">Total: <strong>{dinheiro(total)}</strong></div>
      </fieldset>

      <fieldset>
        <legend>Detalhes</legend>
        <div className="duas-colunas">
          <label>Data<input type="date" value={doc.data} onChange={(e) => set('data', e.target.value)} /></label>
          {!recibo && <label>Validade (dias)<input value={doc.validadeDias} onChange={(e) => set('validadeDias', e.target.value)} inputMode="numeric" /></label>}
        </div>
        <label>{recibo ? 'Forma de pagamento' : 'Condições de pagamento'}<input value={doc.pagamento} onChange={(e) => set('pagamento', e.target.value)} /></label>
        <label>Observações<textarea value={doc.obs} onChange={(e) => set('obs', e.target.value)} rows="3" placeholder={recibo ? '' : 'Ex.: Material incluso. Garantia de 90 dias.'} /></label>
      </fieldset>

      {erro && <p className="erro">{erro}</p>}
      <div className="barra-fixa">
        <button type="button" className="botao" onClick={() => history.back()}>Cancelar</button>
        <button className="botao principal">Salvar e ver</button>
      </div>
    </form>
  )
}
