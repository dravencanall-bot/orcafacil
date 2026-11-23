import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { supabase, PLANOS } from '../lib/supabase.js'
import { gerarPix } from '../lib/pix.js'
import { dinheiro, linkWhatsApp } from '../lib/formato.js'
import { useConta, atualizarConta } from '../lib/conta.js'

// Assinatura paga direto no Pix do dono do app; ele confere e libera no painel.
export default function PagamentoManual({ plano, voltar }) {
  const { user, conta } = useConta()
  const [config, setConfig] = useState(null)
  const [qr, setQr] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')
  const p = PLANOS[plano]

  useEffect(() => {
    supabase.from('config').select('*').eq('id', 1).maybeSingle().then(({ data }) => setConfig(data || {}))
  }, [])

  const codigo = config?.pix_chave
    ? gerarPix({ chave: config.pix_chave, tipo: config.pix_escolha, nome: config.pix_nome || 'OrcaFechou', cidade: config.pix_cidade, valor: p.valor, identificador: `PRO${user.id.slice(0, 8)}` })
    : null

  useEffect(() => { if (codigo) QRCode.toDataURL(codigo, { margin: 1, width: 240 }).then(setQr) }, [codigo])

  // Depois de avisar, fica conferindo se o Pro já foi liberado.
  useEffect(() => {
    if (!enviado) return
    const t = setInterval(atualizarConta, 15000)
    return () => clearInterval(t)
  }, [enviado])

  if (!config) return <p className="vazio">Carregando...</p>
  if (!codigo) return (
    <section className="cartao">
      <p>As assinaturas abrem em breve. Volte daqui a pouco!</p>
      <button className="botao" onClick={voltar}>Voltar</button>
    </section>
  )

  const copiar = async () => {
    try { await navigator.clipboard.writeText(codigo) } catch {
      const t = document.createElement('textarea'); t.value = codigo; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove()
    }
    setCopiado(true); setTimeout(() => setCopiado(false), 2500)
  }

  const jaPaguei = async () => {
    setErro('')
    const { error } = await supabase.from('pedidos').insert({ plano })
    if (error && !String(error.message).includes('pedidos_um_pendente') && error.code !== '23505') return setErro('Não deu para registrar agora. Tente de novo.')
    setEnviado(true)
    if (config.whatsapp) {
      const msg = `Olá! Acabei de pagar o OrçaFechou Pro ${p.nome} (${dinheiro(p.valor)}).\nMeu e-mail no app: ${user.email}\nSegue o comprovante:`
      window.open(linkWhatsApp(config.whatsapp, msg), '_blank')
    }
  }

  if (enviado && conta?.pro) return (
    <section className="plano-sucesso">
      <div className="emoji-grande">🎉</div>
      <h1>Pronto, você é Pro!</h1>
      <p>Orçamentos ilimitados liberados. Obrigado por apoiar o OrçaFechou!</p>
      <a className="botao principal grande" href="#/novo">Fazer um orçamento</a>
    </section>
  )

  if (enviado) return (
    <section className="plano-sucesso">
      <div className="emoji-grande">✅</div>
      <h1>Recebemos seu aviso!</h1>
      <p>Assim que o pagamento for conferido, seu Pro é liberado e aparece aqui. Normalmente leva poucas horas.</p>
      {config.whatsapp && <p className="dica">Não esqueça de mandar o comprovante no WhatsApp que abriu.</p>}
      <a className="botao grande" href="#/">Voltar para meus orçamentos</a>
    </section>
  )

  return (
    <section className="cartao pix">
      <h1>Pague com Pix</h1>
      <p><strong>{dinheiro(p.valor)}</strong> · OrçaFechou Pro {p.nome}</p>
      {qr && <img src={qr} alt="QR Code Pix" width="220" height="220" />}
      <button className="botao principal grande" onClick={copiar}>{copiado ? 'Copiado! Cole no app do banco' : '1. Copiar código Pix'}</button>
      <p className="dica">Abra o app do seu banco → Pix → Pix copia e cola. O valor já vem preenchido.</p>
      <button className="botao whatsapp grande" onClick={jaPaguei}>2. Já paguei: enviar comprovante</button>
      {erro && <p className="erro">{erro}</p>}
      <button className="botao-link-simples" onClick={voltar}>Voltar</button>
    </section>
  )
}
