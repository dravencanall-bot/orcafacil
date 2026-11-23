import { useState } from 'react'
import { lerPerfil, salvarPerfil } from '../lib/dados.js'
import { ir } from '../lib/navegar.js'

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
  const set = (campo, valor) => setP((x) => ({ ...x, [campo]: valor }))

  const salvar = (e) => {
    e.preventDefault()
    if (!p.nome.trim()) return setErro('Coloque seu nome ou o nome do seu negócio.')
    if (!p.telefone.trim()) return setErro('Coloque seu WhatsApp: é por ele que o cliente aprova o orçamento.')
    salvarPerfil(p)
    ir(voltar === 'novo' ? '/novo' : '/')
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
        <label>Logo (opcional)
          <input type="file" accept="image/*" onChange={async (e) => e.target.files[0] && set('logo', await reduzirImagem(e.target.files[0]))} />
        </label>
        {p.logo && <div className="logo-previa"><img src={p.logo} alt="Sua logo" /><button type="button" className="botao" onClick={() => set('logo', '')}>Tirar logo</button></div>}
        <div className="cores">
          <span>Cor dos orçamentos</span>
          {CORES.map((c) => (
            <button type="button" key={c} className={p.cor === c ? 'cor ativa' : 'cor'} style={{ background: c }} onClick={() => set('cor', c)} aria-label={`Cor ${c}`} />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Pix (para o cliente te pagar pelo link)</legend>
        <label>Tipo de chave
          <select value={p.pixTipo} onChange={(e) => set('pixTipo', e.target.value)}>
            <option value="celular">Celular</option>
            <option value="cpf">CPF ou CNPJ</option>
            <option value="email">E-mail</option>
            <option value="aleatoria">Chave aleatória</option>
          </select>
        </label>
        <label>Chave Pix<input value={p.pixChave} onChange={(e) => set('pixChave', e.target.value)} placeholder="Sua chave" /></label>
        <label>Nome do titular da conta<input value={p.pixNome} onChange={(e) => set('pixNome', e.target.value)} placeholder="Como aparece no banco" /></label>
        <p className="dica">O dinheiro cai direto na sua conta. O OrçaFácil não toca no seu dinheiro.</p>
      </fieldset>

      {erro && <p className="erro">{erro}</p>}
      <div className="barra-fixa"><button className="botao principal grande">Salvar</button></div>
    </form>
  )
}
