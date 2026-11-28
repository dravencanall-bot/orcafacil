import { useEffect, useState } from 'react'
import { supabase, nuvemAtiva, PLANOS } from '../lib/supabase.js'
import { useConta, marcarEsperandoPro } from '../lib/conta.js'
import { dataBR } from '../lib/formato.js'
import { RECURSOS_PRO } from '../lib/pro.js'

// Comemoração que aparece no app do usuário quando o dono libera o Pro dele.
const chave = (uid) => `orcafechou_pro_visto_${uid}`
const lerVisto = (uid) => { try { return JSON.parse(localStorage.getItem(chave(uid))) } catch { return null } }
const gravarVisto = (uid, v) => { try { localStorage.setItem(chave(uid), JSON.stringify(v)) } catch { /* sem espaço */ } }

const CORES = ['#f97316', '#fbbf24', '#0f766e', '#16a34a', '#ec4899', '#3b82f6']
const confete = Array.from({ length: 36 }, (_, i) => ({
  left: (i * 37) % 100, cor: CORES[i % CORES.length], atraso: (i % 9) * 0.18, duracao: 2.4 + (i % 5) * 0.35, giro: i % 2 ? 1 : -1,
}))

export default function ProAtivado() {
  const { user, conta, admin } = useConta()
  const [festa, setFesta] = useState(null)
  // Só valores simples aqui: a conta é recarregada várias vezes e isso não pode cancelar a checagem.
  const uid = user?.id, temConta = !!conta, pro = !!conta?.pro, proAte = conta?.pro_ate || null

  useEffect(() => {
    if (!nuvemAtiva || !uid || !temConta || admin) return
    let cancelado = false
    ;(async () => {
      const { data } = await supabase.from('pedidos').select('id, plano, status, criado_em').order('id', { ascending: false }).limit(1)
      if (cancelado) return
      const ultimo = data?.[0]
      marcarEsperandoPro(ultimo?.status === 'pendente')
      const visto = lerVisto(uid)
      const ate = pro ? proAte : null
      let plano = null
      if (pro) {
        const pedidoNovo = ultimo?.status === 'aprovado' && ultimo.id !== visto?.pedido
        // Na primeira vez neste aparelho, só comemora se o pedido é recente (até 3 dias).
        const recente = ultimo && Date.now() - new Date(ultimo.criado_em) < 3 * 86400000
        if (pedidoNovo && (visto || recente)) plano = ultimo.plano
        // Dias de Pro somados pelo dono sem pedido (ex.: renovação combinada no WhatsApp).
        else if (visto?.ate && new Date(ate) - new Date(visto.ate) > 86400000) {
          plano = new Date(ate) - new Date(visto.ate) > 300 * 86400000 ? 'anual' : 'mensal'
        }
      }
      gravarVisto(uid, { pedido: ultimo?.status === 'aprovado' ? ultimo.id : visto?.pedido ?? null, ate })
      if (plano) setFesta({ plano, ate })
    })()
    return () => { cancelado = true }
  }, [uid, temConta, pro, proAte, admin])

  useEffect(() => {
    if (!festa) return
    const esc = (e) => e.key === 'Escape' && setFesta(null)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [festa])

  if (!festa) return null
  const p = PLANOS[festa.plano] || PLANOS.mensal
  const fechar = () => setFesta(null)

  return (
    <div className="festa-fundo" role="dialog" aria-modal="true" aria-labelledby="festa-titulo" onClick={fechar}>
      <div className="festa-confete" aria-hidden="true">
        {confete.map((c, i) => (
          <i key={i} style={{ left: `${c.left}%`, background: c.cor, animationDelay: `${c.atraso}s`, animationDuration: `${c.duracao}s`, '--giro': c.giro }} />
        ))}
      </div>
      <div className="festa-cartao" onClick={(e) => e.stopPropagation()}>
        <div className="festa-coroa" aria-hidden="true">👑</div>
        <span className="selo-pro">PRO</span>
        <h1 id="festa-titulo">Seu Pro foi ativado!</h1>
        <p className="festa-sub">Pagamento confirmado. Valeu por apoiar o OrçaFechou!</p>
        <div className="festa-plano">
          <span>Plano {p.nome}</span>
          {festa.ate && <strong>válido até {dataBR(festa.ate)}</strong>}
        </div>
        <ul className="festa-lista">
          <li>✓ Orçamentos ilimitados</li>
          {RECURSOS_PRO.map((r) => <li key={r.id}>{r.icone} {r.titulo}</li>)}
        </ul>
        <a className="botao principal grande" href="#/novo" onClick={fechar}>Fazer um orçamento agora</a>
        <button className="botao-link-simples" onClick={fechar}>Fechar</button>
      </div>
    </div>
  )
}
