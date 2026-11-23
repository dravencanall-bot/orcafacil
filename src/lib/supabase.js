import { createClient } from '@supabase/supabase-js'

// Endereço e chave pública do Supabase (configurados na Vercel).
// Sem eles o app funciona no "modo local" (tudo só no aparelho, sem login e sem plano pago).
const url = import.meta.env.VITE_SUPABASE_URL
const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

export const nuvemAtiva = Boolean(url && chave)
export const supabase = nuvemAtiva
  ? createClient(url, chave, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null

export const PLANOS = {
  mensal: { nome: 'Mensal', valor: 14.9, dias: 30, rotulo: 'R$ 14,90 por mês' },
  anual: { nome: 'Anual', valor: 119, dias: 365, rotulo: 'R$ 119 por ano (sai R$ 9,92 por mês)' },
}
