// Gera o "Pix copia e cola" (BR Code estático do Banco Central).
// O cliente cola esse código no app do banco e o valor já vem preenchido.

function campo(id, valor) {
  const v = String(valor)
  return id + String(v.length).padStart(2, '0') + v
}

function crc16(texto) {
  let crc = 0xffff
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function semAcento(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function cpfValido(d) {
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false
  const dv = (n) => {
    let soma = 0
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i)
    const r = (soma * 10) % 11
    return r === 10 ? 0 : r
  }
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10])
}

// Descobre o tipo da chave pelo que foi digitado.
// Retorna 'cpf' (CPF/CNPJ), 'celular', 'email', 'aleatoria', 'ambiguo' (11 dígitos que podem ser CPF ou celular) ou null (inválida).
export function detectarTipo(chave) {
  const c = String(chave || '').trim()
  if (!c) return null
  if (c.includes('@')) return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c) ? 'email' : null
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c)) return 'aleatoria'
  if (/[a-z]/i.test(c)) return null
  const d = c.replace(/\D/g, '')
  if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(c)) return cpfValido(d) ? 'cpf' : null
  if (d.length === 14) return 'cpf' // CNPJ
  if (c.startsWith('+') || /\(/.test(c)) return 'celular'
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return 'celular'
  if (d.length === 12 && d.startsWith('0')) return 'celular' // 0 + DDD + número
  if (d.length === 11) {
    const cpf = cpfValido(d), cel = d[2] === '9'
    if (cpf && cel) return 'ambiguo'
    if (cpf) return 'cpf'
    if (cel) return 'celular'
    return null
  }
  if (d.length === 10) return 'celular'
  return null
}

// Tipo final usado no Pix: o detectado, ou a escolha da pessoa quando for ambíguo.
export function tipoFinal(chave, escolha) {
  const t = detectarTipo(chave)
  if (t === 'ambiguo') return escolha === 'cpf' ? 'cpf' : escolha === 'celular' ? 'celular' : null
  return t
}

export function normalizarChave(chave, tipo) {
  const c = String(chave || '').trim()
  if (tipo === 'celular') {
    let d = c.replace(/\D/g, '')
    if (d.startsWith('55') && d.length >= 12) return '+' + d
    if (d.startsWith('0')) d = d.slice(1)
    return '+55' + d
  }
  if (tipo === 'cpf') return c.replace(/\D/g, '')
  if (tipo === 'email') return c.toLowerCase()
  return c
}

export function gerarPix({ chave, tipo, nome, cidade, valor, identificador }) {
  const t = tipoFinal(chave, tipo)
  if (!t) return null
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', normalizarChave(chave, t))
  const txid = (semAcento(identificador).replace(/ /g, '') || '***').slice(0, 25)
  let payload =
    campo('00', '01') +
    campo('26', conta) +
    campo('52', '0000') +
    campo('53', '986') +
    (valor > 0 ? campo('54', Number(valor).toFixed(2)) : '') +
    campo('58', 'BR') +
    campo('59', (semAcento(nome) || 'Recebedor').slice(0, 25)) +
    campo('60', (semAcento(cidade) || 'Brasil').slice(0, 15)) +
    campo('62', campo('05', txid))
  payload += '6304'
  return payload + crc16(payload)
}
