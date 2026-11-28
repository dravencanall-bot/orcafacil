import { useCallback, useEffect, useState } from 'react'
import { supabase, PLANOS } from '../lib/supabase.js'
import { useConta, atualizarPendentes } from '../lib/conta.js'
import { detectarTipo } from '../lib/pix.js'
import { dataBR, dinheiro, formatarTelefone, linkWhatsApp } from '../lib/formato.js'

// "há 5 min", "há 3 h", "há 2 dias"
function haQuanto(iso) {
  if (!iso) return ''
  const min = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000))
  if (min < 1) return 'agora mesmo'
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.round(h / 24)
  return `há ${d} ${d === 1 ? 'dia' : 'dias'}`
}
const horaBR = (iso) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '')
const soZap = (t) => String(t || '').replace(/\D/g, '').length >= 10
const primeiroNome = (n) => String(n || '').trim().split(/\s+/)[0] || ''

// Painel do dono do app: configurar o Pix de recebimento e liberar o Pro de quem pagou.
export default function Admin() {
  const { admin, resumo } = useConta()
  const [cfg, setCfg] = useState(null)
  const [msgCfg, setMsgCfg] = useState('')
  const [busca, setBusca] = useState('')
  const [lista, setLista] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [liberado, setLiberado] = useState(null)

  const carregar = useCallback(async (b = '') => {
    setCarregando(true)
    const { data, error } = await supabase.rpc('admin_usuarios', { busca: b })
    if (error) setErro('Não foi possível carregar: ' + error.message)
    setLista(data || [])
    setCarregando(false)
    atualizarPendentes()
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

  const acao = async (nome, args, confirmar, u) => {
    if (confirmar && !confirm(confirmar)) return
    const { data, error } = await supabase.rpc(nome, args)
    if (error) return alert('Erro: ' + error.message)
    if (nome === 'admin_dar_pro' && u) setLiberado({ ...u, ate: data })
    carregar(busca)
  }

  const pendentes = lista.filter((u) => u.pedido_id)
  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }))
  const tipoChave = cfg ? detectarTipo(cfg.pix_chave) : null
  const proAtivos = lista.filter((u) => u.pro_ate && new Date(u.pro_ate) > new Date()).length

  const linha = (u) => {
    const ativo = u.pro_ate && new Date(u.pro_ate) > new Date()
    const pedido = u.pedido_id ? PLANOS[u.pedido_plano] : null
    const zap = u.telefone && soZap(u.telefone)
    return (
      <li key={u.user_id} className={`cartao usuario ${u.pedido_id ? 'esperando' : ''}`}>
        <div>
          <strong>{u.nome || 'Sem nome'}</strong>
          {(u.profissao || u.cidade) && <span className="sub"> · {[u.profissao, u.cidade].filter(Boolean).join(' · ')}</span>}
          <div className="sub">{u.email}{u.telefone && <> · {formatarTelefone(u.telefone)}</>}</div>
          {pedido && (
            <div className="pedido-info">
              <div><span>Pediu</span><strong>Pro {pedido.nome}</strong></div>
              <div><span>Valor a conferir</span><strong>{dinheiro(pedido.valor)}</strong></div>
              <div><span>Quando</span><strong>{dataBR(u.pedido_em)} às {horaBR(u.pedido_em)}</strong><em>{haQuanto(u.pedido_em)}</em></div>
              <div><span>Código no Pix</span><strong>PRO{u.user_id.slice(0, 8)}</strong></div>
            </div>
          )}
          <div className="sub">
            {ativo ? <span className="tag pro">Pro até {dataBR(u.pro_ate)}</span> : <span className="tag">Grátis · {u.usados_mes} de 5 no mês</span>}
            {u.total_orcamentos != null && <span className="tag">{u.total_orcamentos} orç. · {u.total_recibos} recibos no total</span>}
            {u.vezes_pagou > 0 && <span className="tag pago">Já pagou {dinheiro(u.total_pago)} ({u.vezes_pagou}x)</span>}
            {u.pedidos_recusados > 0 && <span className="tag recusado">{u.pedidos_recusados} pedido(s) recusado(s)</span>}
          </div>
          <div className="sub datas">
            Cadastro em {dataBR(u.criado_em)}{u.ultimo_acesso && <> · último acesso {haQuanto(u.ultimo_acesso)}</>}
          </div>
        </div>
        <div className="acoes-linha">
          <button className={u.pedido_plano === 'mensal' ? 'botao principal' : 'botao'} onClick={() => acao('admin_dar_pro', { uid: u.user_id, dias: 30 }, `Liberar 30 dias de Pro para ${u.email}?`, u)}>+30 dias</button>
          <button className={u.pedido_plano === 'anual' ? 'botao principal' : 'botao'} onClick={() => acao('admin_dar_pro', { uid: u.user_id, dias: 365 }, `Liberar 1 ano de Pro para ${u.email}?`, u)}>+1 ano</button>
          {u.pedido_id && <button className="botao" onClick={() => acao('admin_recusar_pedido', { pid: u.pedido_id }, 'Recusar este pedido? (use quando o Pix não caiu)')}>Recusar</button>}
          {zap && <a className="botao" href={linkWhatsApp(u.telefone, `Oi${u.nome ? ' ' + primeiroNome(u.nome) : ''}! Aqui é do OrçaFechou.`)} target="_blank" rel="noreferrer">WhatsApp</a>}
          {ativo && <button className="botao" onClick={() => acao('admin_tirar_pro', { uid: u.user_id }, `Tirar o Pro de ${u.email}?`)}>Tirar Pro</button>}
        </div>
      </li>
    )
  }

  return (
    <section className="admin">
      <h1>Painel do dono</h1>
      <div className="resumo">
        <div><span>Usuários</span><strong>{resumo ? resumo.usuarios : `${lista.length}${lista.length === 200 ? '+' : ''}`}</strong></div>
        <div><span>Pro ativos</span><strong>{resumo ? resumo.pro_ativos : proAtivos}</strong></div>
        <div className={pendentes.length ? 'destaque' : ''}><span>Esperando liberação</span><strong>{pendentes.length}</strong></div>
        {resumo && <div><span>Novos (7 dias)</span><strong>{resumo.novos_7d}</strong></div>}
        {resumo && <div><span>Recebido no mês</span><strong>{dinheiro(resumo.receita_mes)}</strong></div>}
        {resumo && <div><span>Recebido no total</span><strong>{dinheiro(resumo.receita_total)}</strong></div>}
      </div>
      {!resumo && !carregando && <p className="dica">Para ver faturamento, telefone e último acesso de cada pessoa, rode o arquivo painel-v2.sql no Supabase.</p>}

      {liberado && (
        <div className="aviso liberado">
          <p>✓ Pro liberado para <strong>{liberado.nome || liberado.email}</strong>{liberado.ate && <> até {dataBR(liberado.ate)}</>}. Quando a pessoa abrir o app, aparece a comemoração.</p>
          {liberado.telefone && soZap(liberado.telefone) && (
            <a className="botao whatsapp" target="_blank" rel="noreferrer"
              href={linkWhatsApp(liberado.telefone, `Oi${liberado.nome ? ' ' + primeiroNome(liberado.nome) : ''}! Seu OrçaFechou Pro foi liberado${liberado.ate ? ` até ${dataBR(liberado.ate)}` : ''}. É só abrir o app. Obrigado!`)}>
              Avisar no WhatsApp
            </a>
          )}
          <button className="botao-link-simples" onClick={() => setLiberado(null)}>Ok</button>
        </div>
      )}

      <h2>{pendentes.length > 0 && <span className="ponto-notif inline" aria-hidden="true" />}Pedidos para conferir ({pendentes.length})</h2>
      {pendentes.length === 0 ? <p className="dica">Nenhum pedido esperando. Quando alguém tocar em “Já paguei”, aparece aqui.</p> : (
        <>
          <p className="dica">Confira no app do banco se o Pix caiu (valor e horário) e no WhatsApp se chegou o comprovante. Depois toque no botão verde (+30 dias se for mensal, +1 ano se for anual).</p>
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
