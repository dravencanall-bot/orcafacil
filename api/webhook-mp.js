// Aviso automático do Mercado Pago quando um pagamento muda.
// Não confiamos no conteúdo do aviso: consultamos o pagamento direto no Mercado Pago.
import { configurado, mp, processarPagamento, lerCorpo } from './_comum.js'

export default async function handler(req, res) {
  if (configurado().length) return res.status(200).json({ ok: false })
  const corpo = lerCorpo(req)
  const tipo = corpo.type || req.query.type || req.query.topic
  const id = String(corpo.data?.id || req.query['data.id'] || req.query.id || '').replace(/\D/g, '')
  if (tipo !== 'payment' || !id) return res.status(200).json({ ok: true, ignorado: true })
  try {
    const pagamento = await mp(`/v1/payments/${id}`)
    const r = await processarPagamento(pagamento)
    console.log('webhook', id, r.status, r.liberado)
    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('webhook', id, e.status, e.message)
    if (e.status === 404) return res.status(200).json({ ok: true, ignorado: true })
    return res.status(500).json({ ok: false }) // o Mercado Pago tenta de novo depois
  }
}
