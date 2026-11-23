export const dinheiro = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const dataBR = (iso) => {
  if (!iso) return ''
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

export const hojeISO = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

export const somarDias = (iso, dias) => {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + Number(dias || 0))
  return d.toISOString().slice(0, 10)
}

// Aceita "1.234,56", "1234.56", "150" etc.
export const lerNumero = (txt) => {
  if (typeof txt === 'number') return txt
  let s = String(txt || '').trim().replace(/[^\d.,-]/g, '')
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

export function totais(doc) {
  const subtotal = (doc.itens || []).reduce((s, i) => s + lerNumero(i.qtd) * lerNumero(i.valor), 0)
  const desconto = Math.min(lerNumero(doc.desconto), subtotal)
  return { subtotal, desconto, total: Math.max(subtotal - desconto, 0) }
}

export const soDigitos = (s) => String(s || '').replace(/\D/g, '')

export function linkWhatsApp(telefone, texto) {
  let d = soDigitos(telefone)
  if (d && !d.startsWith('55')) d = '55' + d
  return `https://wa.me/${d}?text=${encodeURIComponent(texto)}`
}

// Valor por extenso (para o recibo): 1530.5 -> "mil quinhentos e trinta reais e cinquenta centavos"
const UN = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
const DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const CEM = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

function ate999(n) {
  if (n === 0) return ''
  if (n === 100) return 'cem'
  const c = Math.floor(n / 100), r = n % 100
  const partes = []
  if (c) partes.push(CEM[c])
  if (r) {
    if (r < 20) partes.push(UN[r])
    else {
      const d = Math.floor(r / 10), u = r % 10
      partes.push(u ? `${DEZ[d]} e ${UN[u]}` : DEZ[d])
    }
  }
  return partes.join(' e ')
}

function inteiroExtenso(n) {
  if (n === 0) return 'zero'
  const milhoes = Math.floor(n / 1e6), milhares = Math.floor((n % 1e6) / 1000), resto = n % 1000
  const partes = []
  if (milhoes) partes.push(milhoes === 1 ? 'um milhão' : `${ate999(milhoes)} milhões`)
  if (milhares) partes.push(milhares === 1 ? 'mil' : `${ate999(milhares)} mil`)
  if (resto) partes.push(ate999(resto))
  if (partes.length > 1 && resto && (resto < 100 || resto % 100 === 0)) {
    const ult = partes.pop()
    return partes.join(' ') + ' e ' + ult
  }
  return partes.join(' ')
}

export function porExtenso(valor) {
  const total = Math.round(Number(valor || 0) * 100)
  const reais = Math.floor(total / 100), cent = total % 100
  const partes = []
  if (reais) partes.push(`${inteiroExtenso(reais)}${reais % 1e6 === 0 && reais >= 1e6 ? ' de' : ''} ${reais === 1 ? 'real' : 'reais'}`)
  if (cent) partes.push(`${inteiroExtenso(cent)} ${cent === 1 ? 'centavo' : 'centavos'}`)
  return partes.join(' e ') || 'zero reais'
}
