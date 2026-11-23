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
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
}

export function normalizarChave(chave, tipo) {
  const c = String(chave || '').trim()
  if (tipo === 'celular') {
    const d = c.replace(/\D/g, '')
    if (d.startsWith('55') && d.length >= 12) return '+' + d
    return '+55' + d
  }
  if (tipo === 'cpf') return c.replace(/\D/g, '')
  if (tipo === 'email') return c.toLowerCase()
  return c
}

export function gerarPix({ chave, tipo, nome, cidade, valor, identificador }) {
  if (!chave) return null
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', normalizarChave(chave, tipo))
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
