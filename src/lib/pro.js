// Quem tem acesso aos recursos do Pro.
// No "modo local" (sem Supabase configurado) não existe plano pago, então tudo fica liberado.
import { nuvemAtiva } from './supabase.js'
import { useConta } from './conta.js'

export function usePro() {
  const { conta } = useConta()
  return !nuvemAtiva || Boolean(conta?.pro)
}

// Os 5 recursos exclusivos, usados na página do plano, nos cadeados e na comemoração.
export const RECURSOS_PRO = [
  { id: 'cobrar', icone: '💰', titulo: 'Cobrança pronta no WhatsApp', texto: 'O app separa quem ainda não pagou e monta a mensagem com o seu Pix. Um toque e o cliente é lembrado.' },
  { id: 'visto', icone: '👀', titulo: 'Saiba quando o cliente abriu', texto: '"Dona Maria abriu seu orçamento agora." Você chama na hora certa e fecha mais.' },
  { id: 'catalogo', icone: '📋', titulo: 'Catálogo de serviços', texto: 'Seus serviços e preços salvos. Monta o orçamento em 3 toques, sem digitar tudo de novo.' },
  { id: 'marca', icone: '🎨', titulo: 'Sua marca no orçamento', texto: 'Sua logo, a cor que quiser, 3 estilos de folha e sem a marca OrçaFechou.' },
  { id: 'resumo', icone: '📊', titulo: 'Resumo do mês', texto: 'Quanto você orçou, fechou e recebeu. Compare com os meses anteriores.' },
]
