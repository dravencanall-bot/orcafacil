// Cria a cobrança Pix do plano Pro e devolve o QR Code.
import { PLANOS, configurado, usuarioDaRequisicao, mp, dataMP, lerCorpo } from './_comum.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST' })
  const faltando = configurado()
  if (faltando.length) return res.status(503).json({ erro: `Pagamento ainda não configurado (faltando: ${faltando.join(', ')})` })

  const user = await usuarioDaRequisicao(req)
  if (!user) return res.status(401).json({ erro: 'Entre na sua conta de novo.' })

  const planoId = lerCorpo(req).plano
  const plano = PLANOS[planoId]
  if (!plano) return res.status(400).json({ erro: 'Plano inválido' })

  const site = `https://${req.headers['x-forwarded-host'] || req.headers.host}`
  try {
    const p = await mp('/v1/payments', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': `${user.id}-${planoId}-${Date.now()}` },
      body: JSON.stringify({
        transaction_amount: plano.valor,
        description: `OrçaFechou Pro - ${plano.nome}`,
        payment_method_id: 'pix',
        payer: { email: user.email },
        external_reference: `${user.id}|${planoId}`,
        notification_url: `${site}/api/webhook-mp`,
        date_of_expiration: dataMP(30),
      }),
    })
    const t = p.point_of_interaction?.transaction_data || {}
    return res.status(200).json({ id: String(p.id), valor: plano.valor, copiaecola: t.qr_code, qrBase64: t.qr_code_base64, status: p.status })
  } catch (e) {
    console.error('checkout', e.status, JSON.stringify(e.corpo || e.message))
    return res.status(502).json({ erro: 'Não foi possível gerar o Pix agora. Tente de novo em instantes.' })
  }
}
