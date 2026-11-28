// Catálogo de serviços salvos: fica no aparelho e, com login, também na conta (tabela "catalogos").
import { supabase, nuvemAtiva } from './supabase.js'
import { listarDocs, novoId } from './dados.js'
import { lerNumero } from './formato.js'

const CHAVE = 'of_catalogo'
export const LIMITE_GRATIS_CATALOGO = 3

export function lerCatalogo() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) || [] } catch { return [] }
}
const gravarLocal = (itens) => { try { localStorage.setItem(CHAVE, JSON.stringify(itens)) } catch { /* sem espaço */ } }

export async function salvarCatalogo(itens) {
  gravarLocal(itens)
  if (!nuvemAtiva) return
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  if (!user) return
  const { error } = await supabase.from('catalogos').upsert({ user_id: user.id, itens, atualizado_em: new Date().toISOString() })
  // Se o SQL novo ainda não foi rodado, o catálogo fica só neste aparelho (sem travar o app).
  if (error && !/catalogos|schema cache|does not exist/i.test(error.message || '')) throw new Error('Não deu para salvar o catálogo na conta. Confira a internet.')
}

// Chamado ao entrar na conta.
export async function baixarCatalogo(user) {
  const { data, error } = await supabase.from('catalogos').select('itens').eq('user_id', user.id).maybeSingle()
  if (error) return // tabela ainda não existe: mantém o que tem no aparelho
  if (data?.itens) gravarLocal(data.itens)
  else if (lerCatalogo().length) salvarCatalogo(lerCatalogo()).catch(() => {})
}
export const limparCatalogo = () => localStorage.removeItem(CHAVE)

export const itemCatalogo = (desc = '', valor = '', tipo = 'servico') => ({ id: novoId(), desc, valor, tipo })

// Serviços que a pessoa já colocou em orçamentos (para montar o catálogo num toque).
export function sugestoesDoHistorico() {
  const ja = new Set(lerCatalogo().map((i) => i.desc.trim().toLowerCase()))
  const vistos = new Map()
  for (const d of listarDocs()) for (const i of d.itens || []) {
    const desc = (i.desc || '').trim()
    const chave = desc.toLowerCase()
    if (!desc || ja.has(chave)) continue
    const atual = vistos.get(chave)
    if (atual) atual.vezes++
    else vistos.set(chave, { desc, valor: lerNumero(i.valor) ? String(i.valor) : '', tipo: i.tipo === 'material' ? 'material' : 'servico', vezes: 1 })
  }
  return [...vistos.values()].sort((a, b) => b.vezes - a.vezes).slice(0, 30)
}
