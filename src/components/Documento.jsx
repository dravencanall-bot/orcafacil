import { dinheiro, dataBR, somarDias, totais, lerNumero, porExtenso, formatarTelefone } from '../lib/formato.js'

// O "papel" do orçamento/recibo: é o que o cliente vê e o que vira PDF.
export default function Documento({ doc, perfil, marca = true }) {
  const { subtotal, desconto, total } = totais(doc)
  const recibo = doc.tipo === 'recibo'
  const cor = perfil.cor || '#0f766e'
  const validade = doc.validadeDias ? somarDias(doc.data, doc.validadeDias) : null
  const preenchidos = (doc.itens || []).filter((i) => i.desc || lerNumero(i.valor))
  const grupos = [
    { titulo: 'Mão de obra', itens: preenchidos.filter((i) => i.tipo !== 'material') },
    { titulo: 'Materiais', itens: preenchidos.filter((i) => i.tipo === 'material') },
  ].filter((g) => g.itens.length).map((g) => ({ ...g, soma: g.itens.reduce((s, i) => s + lerNumero(i.qtd) * lerNumero(i.valor), 0) }))
  const condicoes = [
    ['Pagamento', doc.pagamento],
    !recibo && ['Prazo de execução', doc.prazo],
    ['Garantia', doc.garantia],
    !recibo && validade && ['Validade', `Até ${dataBR(validade)}`],
  ].filter((c) => c && c[1])

  return (
    <article className="papel" style={{ '--cor': cor }}>
      <div className="papel-topo">
        <div className="papel-emissor">
          {perfil.logo && <img src={perfil.logo} alt="" className="papel-logo" />}
          <div>
            <strong className="papel-nome">{perfil.nome || 'Seu nome'}</strong>
            {perfil.profissao && <div>{perfil.profissao}</div>}
            <div className="papel-contato">
              {[formatarTelefone(perfil.telefone), perfil.cidade, perfil.documento && `CPF/CNPJ ${perfil.documento}`].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>
        <div className="papel-tipo">
          <div className="papel-titulo">{recibo ? 'RECIBO' : 'ORÇAMENTO'}</div>
          <div>Nº {String(doc.numero || 1).padStart(4, '0')}</div>
          <div>{dataBR(doc.data)}</div>
        </div>
      </div>

      {recibo ? (
        <p className="papel-declaracao">
          Recebi de <strong>{doc.cliente?.nome || '________'}</strong> a quantia de{' '}
          <strong>{dinheiro(total)}</strong> ({porExtenso(total)}), referente aos serviços abaixo.
        </p>
      ) : (
        <div className="papel-cliente">
          <span className="rotulo">Cliente</span>
          <strong>{doc.cliente?.nome || '—'}</strong>
          {[doc.cliente?.telefone, doc.cliente?.endereco].filter(Boolean).length > 0 && (
            <div className="papel-contato">{[formatarTelefone(doc.cliente?.telefone), doc.cliente?.endereco].filter(Boolean).join(' · ')}</div>
          )}
        </div>
      )}

      {grupos.map((g) => (
        <div key={g.titulo} className="papel-grupo">
          {grupos.length > 1 && <div className="papel-grupo-titulo">{g.titulo}</div>}
          <table className="papel-itens">
            <thead>
              <tr><th>Descrição</th><th className="num">Qtd</th><th className="num">Valor</th><th className="num">Total</th></tr>
            </thead>
            <tbody>
              {g.itens.map((i, k) => (
                <tr key={k}>
                  <td>{i.desc}</td>
                  <td className="num">{lerNumero(i.qtd).toLocaleString('pt-BR')}</td>
                  <td className="num">{dinheiro(lerNumero(i.valor))}</td>
                  <td className="num">{dinheiro(lerNumero(i.qtd) * lerNumero(i.valor))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {grupos.length > 1 && <div className="papel-grupo-sub"><span>Subtotal {g.titulo.toLowerCase()}</span><span>{dinheiro(g.soma)}</span></div>}
        </div>
      ))}

      <div className="papel-totais">
        {desconto > 0 && (<>
          <div><span>Subtotal</span><span>{dinheiro(subtotal)}</span></div>
          <div><span>Desconto</span><span>− {dinheiro(desconto)}</span></div>
        </>)}
        <div className="papel-total"><span>Total</span><span>{dinheiro(total)}</span></div>
      </div>

      {condicoes.length > 0 && (
        <div className="papel-condicoes">
          {condicoes.map(([r, v]) => <div key={r} className="papel-cond"><span className="rotulo">{r}</span>{v}</div>)}
        </div>
      )}
      {doc.obs && <p className="papel-obs"><span className="rotulo">Observações</span>{doc.obs}</p>}

      {recibo && (
        <div className="papel-assinatura">
          <div className="linha-assinatura" />
          <div>{perfil.nome}</div>
          <div className="papel-contato">{perfil.cidade}{perfil.cidade ? ', ' : ''}{dataBR(doc.data)}</div>
        </div>
      )}

      {marca && <footer className="papel-rodape">Feito com OrçaFechou</footer>}
    </article>
  )
}
