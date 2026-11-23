// Guarda tudo no próprio celular/navegador da pessoa (localStorage).
// Na fase 2 isso passa para o Supabase (conta online + backup).
import LZ from 'lz-string'

const CHAVE_PERFIL = 'of_perfil'
const CHAVE_DOCS = 'of_docs'

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
    alert('Não foi possível salvar. Verifique se o navegador não está em modo anônimo.')
  }
}

export const perfilVazio = {
  nome: '', profissao: '', telefone: '', cidade: '', documento: '',
  pixChave: '', pixTipo: 'celular', pixNome: '', cor: '#0f766e', logo: '',
}

export const lerPerfil = () => ({ ...perfilVazio, ...ler(CHAVE_PERFIL, {}) })
export const salvarPerfil = (p) => gravar(CHAVE_PERFIL, p)

export const listarDocs = () => ler(CHAVE_DOCS, []).sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''))
export const pegarDoc = (id) => listarDocs().find((d) => d.id === id)

export function salvarDoc(doc) {
  const docs = ler(CHAVE_DOCS, [])
  const i = docs.findIndex((d) => d.id === doc.id)
  if (i >= 0) docs[i] = doc
  else docs.push(doc)
  gravar(CHAVE_DOCS, docs)
}

export function apagarDoc(id) {
  gravar(CHAVE_DOCS, ler(CHAVE_DOCS, []).filter((d) => d.id !== id))
}

export function proximoNumero() {
  const docs = ler(CHAVE_DOCS, [])
  return docs.reduce((m, d) => Math.max(m, Number(d.numero) || 0), 0) + 1
}

export const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

// Link compartilhável: os dados do orçamento vão "dentro" do próprio link,
// comprimidos. Assim o cliente abre no celular sem precisar de servidor.
export function codificar(doc, perfil) {
  const { logo, ...p } = perfil // logo fica de fora para o link não ficar gigante
  const pacote = { v: 1, p, d: { ...doc, status: undefined } }
  return LZ.compressToEncodedURIComponent(JSON.stringify(pacote))
}

export function decodificar(txt) {
  try {
    const json = LZ.decompressFromEncodedURIComponent(txt)
    const pacote = JSON.parse(json)
    if (!pacote || !pacote.d) return null
    return { doc: pacote.d, perfil: { ...perfilVazio, ...pacote.p } }
  } catch {
    return null
  }
}

export function linkPublico(doc, perfil) {
  return `${location.origin}/#/v/${codificar(doc, perfil)}`
}
