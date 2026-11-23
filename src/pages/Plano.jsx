import { useEffect, useRef, useState } from 'react'
import { supabase, PLANOS } from '../lib/supabase.js'
import { useConta, atualizarConta, diasRestantes } from '../lib/conta.js'
import { dataBR } from '../lib/formato.js'
import PagamentoManual from '../components/PagamentoManual.jsx'

// '1' = cobrança automática pelo Mercado Pago (precisa do MP_ACCESS_TOKEN no servidor).
// Qualquer outro valor = pagamento manual no Pix do dono do app, liberado no painel.
const AUTOMATICO = import.meta.env.VITE_PAGAMENTO_AUTOMATICO === '1'

async function chamar(caminho, opcoes = {}) {
  const { data } = await supabase.auth.getSession()
  const r = await fetch(caminho, {
    ...opcoes,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` },
  })
  const corpo = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(corpo.erro || 'Algo deu errado. Tente de novo.')
  return corpo
}

export default function Plano() {
  const { conta } = useConta()
  const [cobranca, setCobranca] = useState(null)
  const [erro, setErro] = useState('')
  const [gerando, setGerando] = useState('')
  const [pago, setPago] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [manual, setManual] = useState('')
  const [pedidoPendente, setPedidoPendente] = useState(false)
  const timer = useRef()

  useEffect(() => {
    if (!AUTOMATICO) supabase.from('pedidos').select('id').eq('status', 'pendente').then(({ data }) => setPedidoPendente(!!data?.length))
  }, [])

  useEffect(() => { atualizarConta() }, [])

  // Enquanto o QR Code está na tela, pergunta ao servidor se já caiu.
  useEffect(() => {
    if (!cobranca || pago) return
    const checar = async () => {
      try {
        const r = await chamar(`/api/verificar?id=${cobranca.id}`)
        if (r.liberado) { setPago(true); atualizarConta(); return }
        if (['cancelled', 'rejected', 'expired'].includes(r.status)) { setErro('Esse Pix expirou. Gere outro.'); setCobranca(null); return }
      } catch { /* tenta de novo */ }
      timer.current = setTimeout(checar, 4000)
    }
    timer.current = setTimeout(checar, 4000)
    return () => clearTimeout(timer.current)
  }, [cobranca, pago])

  const assinar = async (plano) => {
    if (!AUTOMATICO) return setManual(plano)
    setErro(''); setGerando(plano)
    try { setCobranca(await chamar('/api/checkout', { method: 'POST', body: JSON.stringify({ plano }) })) }
    catch (e) { setErro(e.message) }
    setGerando('')
  }

  const copiar = async () => {
    try { await navigator.clipboard.writeText(cobranca.copiaecola) } catch {
      const t = document.createElement('textarea'); t.value = cobranca.copiaecola; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove()
    }
    setCopiado(true); setTimeout(() => setCopiado(false), 2500)
  }

  if (manual) return <PagamentoManual plano={manual} voltar={() => setManual('')} />

  if (pago) {
    return (
      <section className="plano-sucesso">
        <div className="emoji-grande">🎉</div>
        <h1>Pronto, você é Pro!</h1>
        <p>Orçamentos ilimitados liberados{conta?.pro_ate ? ` até ${dataBR(conta.pro_ate)}` : ''}. Obrigado por apoiar o OrçaFechou!</p>
        <a className="botao principal grande" href="#/novo">Fazer um orçamento</a>
      </section>
    )
  }

  if (cobranca) {
    return (
      <section className="cartao pix">
        <h1>Pague com Pix</h1>
        <p><strong>R$ {cobranca.valor.toFixed(2).replace('.', ',')}</strong> · OrçaFechou Pro</p>
        {cobranca.qrBase64 && <img src={`data:image/png;base64,${cobranca.qrBase64}`} alt="QR Code Pix" width="220" height="220" />}
        <button className="botao principal grande" onClick={copiar}>{copiado ? 'Copiado! Cole no app do banco' : 'Copiar código Pix'}</button>
        <p className="dica">Abra o app do seu banco → Pix → Pix copia e cola. Assim que pagar, esta tela muda sozinha.</p>
        <p className="aguardando"><span className="bolinha" /> Aguardando o pagamento...</p>
        <button className="botao-link-simples" onClick={() => setCobranca(null)}>Voltar</button>
      </section>
    )
  }

  const dias = diasRestantes(conta)
  return (
    <section>
      <h1>Seu plano</h1>
      {conta?.pro ? (
        <div className={`cartao status-plano ${dias <= 5 ? 'vencendo' : ''}`}>
          <strong>Pro ativo</strong>
          <span>Válido até {dataBR(conta.pro_ate)} ({dias} {dias === 1 ? 'dia' : 'dias'})</span>
          {dias <= 5 && <span>Renove para não voltar ao limite grátis. Os dias que faltam são somados.</span>}
        </div>
      ) : (
        <div className="cartao status-plano">
          <strong>Plano grátis</strong>
          <span>{conta ? `${Math.min(conta.usados_mes, conta.limite)} de ${conta.limite} orçamentos usados este mês` : 'Carregando...'}</span>
          <div className="barra-uso"><div style={{ width: `${conta ? Math.min(100, (conta.usados_mes / conta.limite) * 100) : 0}%` }} /></div>
        </div>
      )}

      {pedidoPendente && !conta?.pro && <p className="aviso-plano">Recebemos seu aviso de pagamento. Seu Pro será liberado assim que for conferido.</p>}
      <div className="planos">
        {Object.entries(PLANOS).map(([id, p]) => (
          <div key={id} className={`cartao plano ${id === 'anual' ? 'destaque' : ''}`}>
            {id === 'anual' && <span className="selo">Economize 33%</span>}
            <h2>Pro {p.nome}</h2>
            <p className="preco">{p.rotulo}</p>
            <ul>
              <li>✓ Orçamentos ilimitados</li>
              <li>✓ Sem a marca “Feito com OrçaFechou”</li>
              <li>✓ Sem anúncios, sempre</li>
            </ul>
            <button className={id === 'anual' ? 'botao principal grande' : 'botao grande'} onClick={() => assinar(id)} disabled={!!gerando}>
              {gerando === id ? 'Gerando Pix...' : conta?.pro ? 'Renovar com Pix' : 'Assinar com Pix'}
            </button>
          </div>
        ))}
      </div>
      {erro && <p className="erro">{erro}</p>}
      <p className="dica">Pagamento único por Pix, sem débito automático e sem fidelidade. Perto de vencer, o app te avisa para renovar.{!AUTOMATICO && ' A liberação é conferida por uma pessoa e costuma levar poucas horas.'}</p>
    </section>
  )
}
