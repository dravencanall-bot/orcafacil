import { nuvemAtiva } from '../lib/supabase.js'
import { useConta, diasRestantes } from '../lib/conta.js'

// Faixa no topo da lista: quanto do plano grátis já usou, ou aviso de Pro vencendo.
export default function AvisoPlano() {
  const { conta } = useConta()
  if (!nuvemAtiva || !conta) return null
  if (conta.pro) {
    const dias = diasRestantes(conta)
    if (dias > 5) return null
    return <a href="#/plano" className="aviso-plano alerta">Seu Pro vence em {dias} {dias === 1 ? 'dia' : 'dias'}. <strong>Renovar →</strong></a>
  }
  const restam = Math.max(conta.limite - conta.usados_mes, 0)
  return (
    <a href="#/plano" className={`aviso-plano ${restam === 0 ? 'alerta' : ''}`}>
      {restam === 0
        ? <>Você usou os {conta.limite} orçamentos grátis deste mês. <strong>Seja Pro →</strong></>
        : <>Plano grátis: {restam} de {conta.limite} orçamentos restantes este mês. <strong>Ver Pro</strong></>}
    </a>
  )
}
