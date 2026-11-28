// Dados do app.
// - Leitura: sempre de uma cópia guardada no aparelho (rápido e funciona sem internet).
// - Gravação: quando o login está ativo, grava primeiro no servidor (Supabase) e depois na cópia local.
import LZ from 'lz-string'
import { supabase, nuvemAtiva } from './supabase.js'

const CHAVE_PERFIL = 'of_perfil'
const CHAVE_DOCS = 'of_docs'
const CHAVE_DONO = 'of_dono' // id do usuário dono da cópia local

const ler = (k, padrao) => {
  try {
    const v = localStorage.getItem(k)
    return v ? JSON.parse(v) : padrao
  } catch {
    return padrao
  }
}
const gravar = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {
    alert('Não foi possível salvar neste aparelho. Verifique se o navegador não está em modo anônimo.')
  }
}

export const perfilVazio = {
  nome: '', profissao: '', telefone: '', cidade: '', documento: '',
  pixChave: '', pixEscolha: '', pixNome: '', cor: '#0f766e', logo: '',
}

// ---------- leitura (síncrona, da cópia local) ----------
export const lerPerfil = () => ({ ...perfilVazio, ...ler(CHAVE_PERFIL, {}) })
export const listarDocs = () => ler(CHAVE_DOCS, []).sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''))
export const pegarDoc = (id) => listarDocs().find((d) => d.id === id)
export function proximoNumero() {
  return ler(CHAVE_DOCS, []).reduce((m, d) => Math.max(m, Number(d.numero) || 0), 0) + 1
}

// Id difícil de adivinhar (vai no link curto do cliente).
export function novoId() {
  const b = new Uint8Array(9)
  crypto.getRandomValues(b)
  return Array.from(b, (x) => 'abcdefghijkmnpqrstuvwxyz23456789'[x % 32]).join('')
}

// ---------- gravação ----------
export class ErroLimite extends Error {}

function traduzirErro(error) {
  if (!error) return null
  if (String(error.message || '').includes('LIMITE_GRATIS')) return new ErroLimite('Limite do plano grátis')
  if (String(error.message || '').toLowerCase().includes('fetch')) return new Error('Sem internet. Confira a conexão e tente de novo.')
  return new Error(error.message || 'Erro ao salvar')
}

async function usuarioAtual() {
  if (!nuvemAtiva) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user || null
}

export async function salvarPerfil(p) {
  const user = await usuarioAtual()
  if (user) {
    const { error } = await supabase.from('perfis').upsert({ user_id: user.id, dados: p, atualizado_em: new Date().toISOString() })
    if (error) throw traduzirErro(error)
  }
  gravar(CHAVE_PERFIL, p)
}

export async function salvarDoc(doc) {
  const docs = ler(CHAVE_DOCS, [])
  const i = docs.findIndex((d) => d.id === doc.id)
  const user = await usuarioAtual()
  if (user) {
    const { status, ...dados } = doc
    const linha = { id: doc.id, tipo: doc.tipo === 'recibo' ? 'recibo' : 'orcamento', dados: { ...dados, status } }
    const { error } = i >= 0
      ? await supabase.from('docs').update({ dados: linha.dados }).eq('id', doc.id)
      : await supabase.from('docs').insert(linha)
    if (error) throw traduzirErro(error)
  }
  if (i >= 0) docs[i] = doc
  else docs.push(doc)
  gravar(CHAVE_DOCS, docs)
}

export async function apagarDoc(id) {
  const user = await usuarioAtual()
  if (user) {
    const { error } = await supabase.from('docs').delete().eq('id', id)
    if (error) throw traduzirErro(error)
  }
  gravar(CHAVE_DOCS, ler(CHAVE_DOCS, []).filter((d) => d.id !== id))
}

// ---------- sincronização com a conta ----------
// Chamado ao entrar: envia o que estava só no aparelho e baixa tudo da conta.
export async function sincronizar(user) {
  const dono = ler(CHAVE_DONO, null)
  if (dono && dono !== user.id) {
    // Outra pessoa usou este aparelho antes: não mistura os dados.
    localStorage.removeItem(CHAVE_DOCS)
    localStorage.removeItem(CHAVE_PERFIL)
    localStorage.removeItem('of_catalogo')
    localStorage.removeItem('of_aberturas_vistas')
  } else if (!dono) {
    // Dados do "modo local" (antes de existir login): sobe para a conta.
    const locais = ler(CHAVE_DOCS, [])
    const perfilLocal = ler(CHAVE_PERFIL, null)
    if (perfilLocal?.nome) {
      const { data } = await supabase.from('perfis').select('user_id').eq('user_id', user.id).maybeSingle()
      if (!data) await supabase.from('perfis').upsert({ user_id: user.id, dados: perfilLocal })
    }
    for (const d of locais) {
      const { status, ...dados } = d
      await supabase.from('docs').upsert(
        { id: d.id, tipo: d.tipo === 'recibo' ? 'recibo' : 'orcamento', dados: { ...dados, status } },
        { onConflict: 'id', ignoreDuplicates: true },
      ) // se passar do limite grátis, o excedente simplesmente não sobe
    }
  }

  const [perfil, docs] = await Promise.all([
    supabase.from('perfis').select('dados').eq('user_id', user.id).maybeSingle(),
    supabase.from('docs').select('id, dados, criado_em').order('criado_em', { ascending: false }),
  ])
  if (perfil.error || docs.error) throw traduzirErro(perfil.error || docs.error)
  gravar(CHAVE_PERFIL, perfil.data?.dados || {})
  gravar(CHAVE_DOCS, (docs.data || []).map((l) => ({ ...l.dados, id: l.id, criadoEm: l.dados.criadoEm || l.criado_em })))
  gravar(CHAVE_DONO, user.id)
}

export function limparAparelho() {
  ;[CHAVE_DOCS, CHAVE_PERFIL, CHAVE_DONO, 'of_catalogo', 'of_aberturas_vistas'].forEach((k) => localStorage.removeItem(k))
}

// Muda a situação e guarda quando isso aconteceu (usado no resumo do mês e na cobrança).
export function comStatus(doc, status) {
  const agora = new Date().toISOString()
  const novo = { ...doc, status }
  if (status === 'enviado' && !doc.enviadoEm) novo.enviadoEm = agora
  if (status === 'aprovado' && !doc.aprovadoEm) novo.aprovadoEm = agora
  if (status === 'pago') { if (!doc.pagoEm) novo.pagoEm = agora; if (!doc.aprovadoEm) novo.aprovadoEm = agora }
  return novo
}

export async function minhaConta() {
  if (!nuvemAtiva) return null
  const { data, error } = await supabase.rpc('minha_conta')
  if (error) return null
  return data
}

// ---------- link para o cliente ----------
// Modo local: os dados vão "dentro" do link (comprido).
export function codificar(doc, perfil) {
  const { logo: _logo, ...p } = perfil // logo fica de fora para o link não ficar gigante
  const pacote = { v: 1, p, d: { ...doc, status: undefined } }
  return LZ.compressToEncodedURIComponent(JSON.stringify(pacote))
}

export function decodificar(txt) {
  try {
    const pacote = JSON.parse(LZ.decompressFromEncodedURIComponent(txt))
    if (!pacote || !pacote.d) return null
    return { doc: pacote.d, perfil: { ...perfilVazio, ...pacote.p }, pro: false }
  } catch {
    return null
  }
}

// Com login: link curto, o cliente busca o orçamento no servidor.
export async function buscarPublico(id) {
  if (!nuvemAtiva) return null
  const { data, error } = await supabase.rpc('doc_publico', { doc_id: id })
  if (error || !data) return null
  return { doc: { ...data.doc, status: undefined }, perfil: { ...perfilVazio, ...data.perfil }, pro: data.pro }
}

export function linkPublico(doc, perfil) {
  if (nuvemAtiva && ler(CHAVE_DONO, null)) return `${location.origin}/#/o/${doc.id}`
  return `${location.origin}/#/v/${codificar(doc, perfil)}`
}

// ---------- sugestões e cópia de segurança ----------
export function servicosUsados() {
  const contagem = {}
  for (const d of ler(CHAVE_DOCS, [])) for (const i of d.itens || []) {
    const t = (i.desc || '').trim()
    if (t) contagem[t] = (contagem[t] || 0) + 1
  }
  return Object.entries(contagem).sort((a, b) => b[1] - a[1]).map(([t]) => t).slice(0, 50)
}

export function ultimoValor(desc) {
  for (const d of listarDocs()) for (const i of d.itens || []) if (i.desc === desc && i.valor) return i.valor
  return ''
}

export function exportarBackup() {
  const dados = { app: 'orcafechou', versao: 1, exportadoEm: new Date().toISOString(), perfil: lerPerfil(), docs: ler(CHAVE_DOCS, []) }
  const blob = new Blob([JSON.stringify(dados)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `orcafechou-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export async function importarBackup(arquivo) {
  const dados = JSON.parse(await arquivo.text())
  if (!['orcafechou', 'orcafacil'].includes(dados.app) || !Array.isArray(dados.docs)) throw new Error('Arquivo inválido')
  const ids = new Set(ler(CHAVE_DOCS, []).map((d) => d.id))
  let n = 0
  for (const d of dados.docs.filter((d) => !ids.has(d.id))) {
    try { await salvarDoc(d); n++ } catch (e) { if (e instanceof ErroLimite) break; else throw e }
  }
  if (!lerPerfil().nome && dados.perfil) await salvarPerfil(dados.perfil)
  return n
}
