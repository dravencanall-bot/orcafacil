// Funções compartilhadas pelo servidor (Vercel Functions).
// As chaves secretas ficam só aqui no servidor, nunca no app do celular.
import { createClient } from '@supabase/supabase-js'

export const PLANOS = {
  mensal: { nome: 'Mensal', valor: 14.9, dias: 30 },
  anual: { nome: 'Anual', valor: 119, dias: 365 },
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
export const MP_TOKEN = process.env.MP_ACCESS_TOKEN

export function configurado() {
  const faltando = []
  if (!SUPABASE_URL) faltando.push('SUPABASE_URL')
  if (!SUPABASE_SECRET) faltando.push('SUPABASE_SECRET_KEY')
  if (!MP_TOKEN) faltando.push('MP_ACCESS_TOKEN')
  return faltando
}

let _admin
export const admin = () => (_admin ||= createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false, autoRefreshToken: false } }))

export async function usuarioDaRequisicao(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await admin().auth.getUser(token)
  if (error) return null
  return data.user
}

export async function mp(caminho, opcoes = {}) {
  const r = await fetch(`https://api.mercadopago.com${caminho}`, {
    ...opcoes,
    headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json', ...(opcoes.headers || {}) },
  })
  const corpo = await r.json().catch(() => ({}))
  if (!r.ok) {
    const erro = new Error(corpo.message || `Mercado Pago respondeu ${r.status}`)
    erro.status = r.status
    erro.corpo = corpo
    throw erro
  }
  return corpo
}

// Se o pagamento foi aprovado e o valor confere, libera o Pro (pode chamar várias vezes: só libera 1 vez).
export async function processarPagamento(pagamento) {
  if (pagamento.status !== 'approved') return { liberado: false, status: pagamento.status }
  const [userId, planoId] = String(pagamento.external_reference || '').split('|')
  const plano = PLANOS[planoId]
  if (!userId || !plano) return { liberado: false, status: 'referencia_invalida' }
  if (Number(pagamento.transaction_amount) + 0.001 < plano.valor) return { liberado: false, status: 'valor_divergente' }
  const { data, error } = await admin().rpc('liberar_pro', {
    p_pagamento: String(pagamento.id), p_user: userId, p_plano: planoId,
    p_valor: pagamento.transaction_amount, p_dias: plano.dias,
  })
  if (error) throw new Error(error.message)
  return { liberado: true, status: 'approved', pro_ate: data, userId }
}

// Data no formato que o Mercado Pago pede, no fuso de Brasília: 2026-11-23T18:30:00.000-03:00
export function dataMP(minutosAFrente) {
  const d = new Date(Date.now() + minutosAFrente * 60000 - 3 * 3600000)
  return d.toISOString().replace('Z', '-03:00')
}

export function lerCorpo(req) {
  if (req.body && typeof req.body === 'object') return req.body
  try { return JSON.parse(req.body || '{}') } catch { return {} }
}
