import { useState } from 'react'
import { lerPerfil, salvarPerfil, exportarBackup, importarBackup, listarDocs } from '../lib/dados.js'
import { ir } from '../lib/navegar.js'
import { nuvemAtiva } from '../lib/supabase.js'
import { useConta, sair } from '../lib/conta.js'
import { detectarTipo } from '../lib/pix.js'
import { usePro } from '../lib/pro.js'
import { hojeISO } from '../lib/formato.js'
import { EXEMPLO } from '../lib/modelos.js'
import Documento, { ESTILOS } from '../components/Documento.jsx'
import Cadeado from '../components/Cadeado.jsx'

const EXEMPLO_DOC = { ...EXEMPLO.doc, data: hojeISO(), itens: EXEMPLO.doc.itens.slice(0, 2), obs: '', garantia: '', prazo: '', pagamento: '' }

const NOMES_TIPO = { cpf: 'CPF/CNPJ', celular: 'Celular', email: 'E-mail', aleatoria: 'Chave aleatória' }

function reduzirImagem(arquivo, tamanho = 240) {
  return new Promise((ok) => {
    const img = new Image()
    img.onload = () => {
      const escala = Math.min(1, tamanho / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      ok(c.toDataURL('image/png'))
    }
    img.src = URL.createObjectURL(arquivo)
  })
}

const CORES = ['#0f766e', '#1d4ed8', '#b91c1c', '#c2410c', '#7c3aed', '#111827']

export default function Perfil({ voltar }) {
  const [p, setP] = useState(lerPerfil())
  const [erro, setErro] = useState('')
  const [msgBackup, setMsgBackup] = useState('')
  const restaurar = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    try { const n = await importarBackup(f); setMsgBackup(`Pronto! ${n} documento(s) restaurados.`); setP(lerPerfil()) }
    catch { setMsgBackup('Esse arquivo não é um backup do OrçaFechou.') }
  }
  const set = (campo, valor) => setP((x) => ({ ...x, [campo]: valor }))
  const tipoChave = detectarTipo(p.pixChave)

  const { user, admin } = useConta()
  const pro = usePro()
  const [salvando, setSalvando] = useState(false)
  const salvar = async (e) => {
    e.preventDefault()
    setErro('')
    if (!p.nome.trim()) return setErro('Coloque seu nome ou o nome do seu negócio.')
    if (!p.telefone.trim()) return setErro('Coloque seu WhatsApp: é por ele que o cliente aprova o orçamento.')
    if (p.pixChave.trim() && tipoChave === null) return setErro('A chave Pix não parece válida. Confira ou deixe em branco.')
    if (tipoChave === 'ambiguo' && !p.pixEscolha) return setErro('Diga se a chave Pix é seu CPF ou seu celular.')
    setSalvando(true)
    try {
      await salvarPerfil(p)
      ir(voltar === 'novo' ? '/novo' : '/')
    } catch (err) {
      setErro(err.message)
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={salvar} className="formulario">
      <h1>Meus dados</h1>
      <p className="dica">Isso aparece no topo de todos os seus orçamentos.</p>
      <fieldset>
        <legend>Seu negócio</legend>
        <label>Nome ou nome do negócio*<input value={p.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Ex.: João Elétrica" /></label>
        <label>Profissão<input value={p.profissao} onChange={(e) => set('profissao', e.target.value)} placeholder="Ex.: Eletricista residencial" /></label>
        <label>Seu WhatsApp*<input value={p.telefone} onChange={(e) => set('telefone', e.target.value)} placeholder="(11) 98888-7777" inputMode="tel" /></label>
        <label>Cidade<input value={p.cidade} onChange={(e) => set('cidade', e.target.value)} placeholder="Ex.: Campinas - SP" /></label>
        <label>CPF ou CNPJ (opcional)<input value={p.documento} onChange={(e) => set('documento', e.target.value)} inputMode="numeric" /></label>
      </fieldset>

      <fieldset className={pro ? '' : 'fieldset-pro'}>
        <legend>🎨 Sua marca no orçamento {!pro && <span className="selo-pro pequeno">PRO</span>}</legend>
        <div className="cores">
          <span>Cor</span>
          {CORES.map((c) => (
            <button type="button" key={c} className={p.cor === c ? 'cor ativa' : 'cor'} style={{ background: c }} onClick={() => set('cor', c)} aria-label={`Cor ${c}`} />
          ))}
          <label className={`cor cor-livre ${pro ? '' : 'travada'}`} title="Qualquer cor" style={!CORES.includes(p.cor) ? { background: p.cor, boxShadow: '0 0 0 2px var(--texto)' } : undefined}>
            {pro ? <input type="color" value={p.cor || '#0f766e'} onChange={(e) => set('cor', e.target.value)} aria-label="Escolher qualquer cor" /> : <a href="#/plano" aria-label="Qualquer cor (Pro)">🔒</a>}
          </label>
        </div>
        {pro ? (
          <>
            <label>Logo
              <input type="file" accept="image/*" onChange={async (e) => e.target.files[0] && set('logo', await reduzirImagem(e.target.files[0]))} />
            </label>
            {p.logo && <div className="logo-previa"><img src={p.logo} alt="Sua logo" /><button type="button" className="botao" onClick={() => set('logo', '')}>Tirar logo</button></div>}
            <span className="rotulo-campo">Estilo da folha</span>
            <div className="estilos">
              {Object.entries(ESTILOS).map(([k, v]) => (
                <button type="button" key={k} className={`estilo-opcao mini-${k} ${(p.estilo || 'classico') === k ? 'ativo' : ''}`} style={{ '--cor': p.cor }} onClick={() => set('estilo', k)}>
                  <span className="mini-folha"><i /><i /><i /></span>{v}
                </button>
              ))}
            </div>
            <label>Frase no fim do orçamento<input value={p.rodape || ''} onChange={(e) => set('rodape', e.target.value)} placeholder="Ex.: Obrigado pela preferência! Siga @joaoeletrica" maxLength={140} /></label>
            <p className="dica">✓ Sem a marca “Feito com OrçaFechou”.</p>
          </>
        ) : (
          <Cadeado recurso="marca" texto="Coloque sua logo, qualquer cor, escolha entre 3 estilos de folha, uma frase sua no fim e tire a marca OrçaFechou." />
        )}
        <span className="rotulo-campo">Como fica</span>
        <div className="previa-documento"><Documento doc={EXEMPLO_DOC} perfil={p} pro={pro} marca={!pro} /></div>
      </fieldset>

      <fieldset>
        <legend>Pix (para o cliente te pagar pelo link)</legend>
        <label>Chave Pix<input value={p.pixChave} onChange={(e) => set('pixChave', e.target.value)} placeholder="CPF, celular, e-mail ou chave aleatória" /></label>
        {p.pixChave && tipoChave === null && <p className="erro">Essa chave não parece válida. Confira se digitou o CPF, celular ou e-mail certinho.</p>}
        {p.pixChave && tipoChave && tipoChave !== 'ambiguo' && <p className="aviso">✓ Chave do tipo {NOMES_TIPO[tipoChave]}</p>}
        {tipoChave === 'ambiguo' && (
          <div className="escolha-tipo">
            <p className="dica">Esse número pode ser CPF ou celular. Qual é?</p>
            <div className="acoes-linha">
              {['cpf', 'celular'].map((t) => (
                <button type="button" key={t} className={p.pixEscolha === t ? 'botao principal' : 'botao'} onClick={() => set('pixEscolha', t)}>{t === 'cpf' ? 'É meu CPF' : 'É meu celular'}</button>
              ))}
            </div>
          </div>
        )}
        <label>Nome do titular da conta<input value={p.pixNome} onChange={(e) => set('pixNome', e.target.value)} placeholder="Como aparece no banco" /></label>
        <p className="dica">O dinheiro cai direto na sua conta. O OrçaFechou não toca no seu dinheiro.</p>
      </fieldset>

      <fieldset>
        <legend>Cópia de segurança</legend>
        <p className="dica">{nuvemAtiva ? 'Seus orçamentos já ficam salvos na sua conta. Se quiser, baixe também uma cópia em arquivo.' : 'Seus orçamentos ficam guardados neste aparelho. Baixe uma cópia de vez em quando (ou antes de trocar de celular) e guarde no Google Drive ou mande pra você no WhatsApp.'}</p>
        <div className="acoes-linha">
          <button type="button" className="botao" onClick={exportarBackup} disabled={!listarDocs().length}>Baixar cópia</button>
          <label className="botao arquivo">Restaurar cópia<input type="file" accept="application/json,.json" onChange={restaurar} /></label>
        </div>
        {msgBackup && <p className="aviso">{msgBackup}</p>}
      </fieldset>

      {erro && <p className="erro">{erro}</p>}
      {nuvemAtiva && user && (
        <fieldset>
          <legend>Sua conta</legend>
          <p className="dica">Conectado como <strong>{user.email}</strong>. Seus orçamentos ficam salvos na conta.</p>
          <div className="acoes-linha">
            <a className="botao" href="#/plano">Meu plano</a>
            {admin && <a className="botao principal" href="#/admin">Painel do dono</a>}
            <button type="button" className="botao" onClick={() => confirm('Sair da conta neste aparelho?') && sair()}>Sair</button>
          </div>
        </fieldset>
      )}
      <div className="barra-fixa"><button className="botao principal grande" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button></div>
    </form>
  )
}
