// O app pergunta "já pagou?" a cada poucos segundos. Se o Pix foi aprovado, libera o Pro na hora
// (mesmo que o aviso automático do Mercado Pago atrase).
import { configurado, usuarioDaRequisicao, mp, processarPagamento } from './_comum.js'

export default async function handler(req, res) {
  if (configurado().length) return res.status(503).json({ erro: 'Pagamento não configurado' })
  const user = await usuarioDaRequisicao(req)
  if (!user) return res.status(401).json({ erro: 'Entre na sua conta de novo.' })
  const id = String(req.query.id || '').replace(/\D/g, '')
  if (!id) return res.status(400).json({ erro: 'Falta o id' })
  try {
    const pagamento = await mp(`/v1/payments/${id}`)
    if (!String(pagamento.external_reference || '').startsWith(user.id + '|')) return res.status(404).json({ erro: 'Pagamento não encontrado' })
    const r = await processarPagamento(pagamento)
    return res.status(200).json({ status: pagamento.status, liberado: r.liberado, pro_ate: r.pro_ate || null })
  } catch (e) {
    console.error('verificar', e.status, e.message)
    return res.status(502).json({ erro: 'Não foi possível consultar agora' })
  }
}
