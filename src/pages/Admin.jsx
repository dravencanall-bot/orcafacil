import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useConta } from '../lib/conta.js'
import { detectarTipo } from '../lib/pix.js'
import { dataBR, formatarTelefone, linkWhatsApp } from '../lib/formato.js'

// Painel do dono do app: configurar o Pix de recebimento e liberar o Pro de quem pagou.
export default function Admin() {
  const { admin } = useConta()
  const [cfg, setCfg] = useState(null)
  const [msgCfg, setMsgCfg] = useState('')
  const [busca, setBusca] = useState('')
  const [lista, setLista] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async (b = '') => {
    setCarregando(true)
    const { data, error } = await supabase.rpc('admin_usuarios', { busca: b })
    if (error) setErro('Não foi possível carregar: ' + error.message)
    setLista(data || [])
    setCarregando(false)
  }, [])

  useEffect(() => {
    if (!admin) return
    supabase.from('config').select('*').eq('id', 1).maybeSingle().then(({ data }) => setCfg(data || {}))
    carregar()
  }, [admin, carregar])

  if (!admin) return <p className="vazio">Esta página é só para o dono do app.</p>

  const salvarCfg = async (e) => {
    e.preventDefault()
    const tipo = detectarTipo(cfg.pix_chave)
    if (!tipo) return setMsgCfg('A chave Pix não parece válida.')
    if (tipo === 'ambiguo' && !cfg.pix_escolha) return setMsgCfg('Escolha se a chave é CPF ou celular.')
    const { error } = await supabase.from('config').update({
      pix_chave: cfg.pix_chave.trim(), pix_escolha: cfg.pix_escolha || '', pix_nome: cfg.pix_nome.trim(),
      pix_cidade: cfg.pix_cidade.trim(), whatsapp: cfg.whatsapp.trim(),
    }).eq('id', 1)
    setMsgCfg(error ? 'Erro ao salvar: ' + error.message : '✓ Salvo! Os clientes já veem esse Pix ao assinar.')
  }

  const acao = async (nome, args, confirmar) => {
    if (confirmar && !confirm(confirmar)) return
    const { error } = await supabase.rpc(nome, args)
    if (error) return alert('Erro: ' + error.message)
    carregar(busca)
  }

  const pendentes = lista.filter((u) => u.pedido_id)
  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }))
  const tipoChave = cfg ? detectarTipo(cfg.pix_chave) : null
  const proAtivos = lista.filter((u) => u.pro_ate && new Date(u.pro_ate) > new Date()).length

  const linha = (u) => {
    const ativo = u.pro_ate && new Date(u.pro_ate) > new Date()
    return (
      <li key={u.user_id} className="cartao usuario">
        <div>
          <strong>{u.nome || 'Sem nome'}</strong>
          <div className="sub">{u.email}</div>
          <div className="sub">
            {ativo ? <span className="tag pro">Pro até {dataBR(u.pro_ate)}</span> : <span className="tag">Grátis · {u.usados_mes} orç. no mês</span>}
            {u.pedido_id && <span className="tag pedido">Pediu {u.pedido_plano} em {dataBR(u.pedido_em)}</span>}
          </div>
        </div>
        <div className="acoes-linha">
          <button className={u.pedido_plano === 'mensal' ? 'botao principal' : 'botao'} onClick={() => acao('admin_dar_pro', { uid: u.user_id, dias: 30 }, `Liberar 30 dias de Pro para ${u.email}?`)}>+30 dias</button>
          <button className={u.pedido_plano === 'anual' ? 'botao principal' : 'botao'} onClick={() => acao('admin_dar_pro', { uid: u.user_id, dias: 365 }, `Liberar 1 ano de Pro para ${u.email}?`)}>+1 ano</button>
          {u.pedido_id && <button className="botao" onClick={() => acao('admin_recusar_pedido', { pid: u.pedido_id }, 'Recusar este pedido? (use quando o Pix não caiu)')}>Recusar</button>}
          {ativo && <button className="botao" onClick={() => acao('admin_tirar_pro', { uid: u.user_id }, `Tirar o Pro de ${u.email}?`)}>Tirar Pro</button>}
        </div>
      </li>
    )
  }

  return (
    <section className="admin">
      <h1>Painel do dono</h1>
      <div className="resumo">
        <div><span>Usuários</span><strong>{lista.length}{lista.length === 200 ? '+' : ''}</strong></div>
        <div><span>Pro ativos</span><strong>{proAtivos}</strong></div>
      </div>

      <h2>Pedidos para conferir ({pendentes.length})</h2>
      {pendentes.length === 0 ? <p className="dica">Nenhum pedido esperando. Quando alguém tocar em “Já paguei”, aparece aqui.</p> : (
        <>
          <p className="dica">Confira no app do banco se o Pix caiu (valor e horário) e no WhatsApp se chegou o comprovante. Depois toque em +30 dias (mensal) ou +1 ano (anual).</p>
          <ul className="lista">{pendentes.map(linha)}</ul>
        </>
      )}

      <h2>Todos os usuários</h2>
      <form className="busca" onSubmit={(e) => { e.preventDefault(); carregar(busca) }}>
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por e-mail ou nome" />
        <button className="botao">Buscar</button>
      </form>
      {erro && <p className="erro">{erro}</p>}
      {carregando ? <p className="vazio">Carregando...</p> : <ul className="lista">{lista.filter((u) => !u.pedido_id).map(linha)}</ul>}

      {cfg && (
        <form onSubmit={salvarCfg} className="formulario">
          <h2>Onde você recebe as assinaturas</h2>
          <fieldset>
            <label>Sua chave Pix<input value={cfg.pix_chave} onChange={(e) => set('pix_chave', e.target.value)} placeholder="CPF, celular, e-mail ou aleatória" /></label>
            {tipoChave === 'ambiguo' && (
              <div className="acoes-linha">
                {['cpf', 'celular'].map((t) => <button type="button" key={t} className={cfg.pix_escolha === t ? 'botao principal' : 'botao'} onClick={() => set('pix_escolha', t)}>{t === 'cpf' ? 'É CPF' : 'É celular'}</button>)}
              </div>
            )}
            <label>Nome do titular (como no banco)<input value={cfg.pix_nome} onChange={(e) => set('pix_nome', e.target.value)} /></label>
            <label>Cidade<input value={cfg.pix_cidade} onChange={(e) => set('pix_cidade', e.target.value)} /></label>
            <label>WhatsApp para receber os comprovantes<input value={cfg.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} inputMode="tel" placeholder="(19) 99999-1234" /></label>
            {cfg.whatsapp && <p className="dica">Teste: <a href={linkWhatsApp(cfg.whatsapp, 'teste')} target="_blank" rel="noreferrer">abrir conversa com {formatarTelefone(cfg.whatsapp)}</a></p>}
          </fieldset>
          {msgCfg && <p className={msgCfg.startsWith('✓') ? 'aviso' : 'erro'}>{msgCfg}</p>}
          <button className="botao principal grande">Salvar</button>
        </form>
      )}
    </section>
  )
}
