import BotaoInstalar from '../components/BotaoInstalar.jsx'
import { nuvemAtiva } from '../lib/supabase.js'

// Página de apresentação (quem ainda não tem conta ou ainda não preencheu os dados).
export default function BoasVindas({ logado }) {
  const destino = nuvemAtiva && !logado ? '#/entrar/criar' : '#/perfil/x/novo'
    return (
      <section className="boas-vindas">
        <span className="selo">Grátis para começar · Sem anúncios</span>
        <h1>Orçamento profissional<br />em 1 minuto</h1>
        <p className="lead">Monte o orçamento no celular, mande pelo WhatsApp e receba por Pix. Para instalador de ar-condicionado, eletricista, pintor, encanador e todo autônomo.</p>
        <a className="botao principal grande" href={destino}>{nuvemAtiva && !logado ? 'Criar conta grátis' : 'Fazer meu primeiro orçamento'}</a>
        <a className="botao grande ver-exemplo" href="#/exemplo">Ver um orçamento de exemplo</a>
        <BotaoInstalar />
        <ol className="passos">
          <li><strong>Preencha seus dados</strong><span>Nome, WhatsApp, logo e chave Pix. Só uma vez.</span></li>
          <li><strong>Monte o orçamento</strong><span>Use um modelo pronto, separe mão de obra e material. O total sai sozinho.</span></li>
          <li><strong>Mande pelo WhatsApp</strong><span>O cliente abre o link, aprova e paga pelo QR Code Pix.</span></li>
        </ol>
        <ul className="vantagens">
          <li>✓ Cara de empresa: sua logo e sua cor no orçamento</li>
          <li>✓ Pix com o valor já preenchido, direto na sua conta</li>
          <li>✓ Garantia, prazo e validade no orçamento</li>
          <li>✓ Recibo com valor por extenso e PDF</li>
          <li>✓ Controle do que foi aprovado e pago no mês</li>
        </ul>
        {nuvemAtiva && !logado && <p className="ja-tenho">Já tem conta? <a href="#/entrar">Entrar</a></p>}
      </section>
    )
}
