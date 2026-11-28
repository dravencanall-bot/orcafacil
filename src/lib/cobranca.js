// Cobrança e lembrete pelo WhatsApp: quem precisa ser lembrado e a mensagem pronta.
import { dinheiro, totais, somarDias, hojeISO } from './formato.js'

const DIA = 86400000
const dias = (iso) => (iso ? Math.floor((Date.now() - new Date(iso.length === 10 ? iso + 'T12:00:00' : iso)) / DIA) : 0)

// Aprovados que ainda não foram pagos (cobrar) e enviados sem resposta há 2+ dias (lembrar).
export function paraCobrar(docs) {
  const hoje = hojeISO()
  const cobrar = [], lembrar = []
  for (const d of docs) {
    if (d.tipo === 'recibo') continue
    if (d.status === 'aprovado') cobrar.push({ doc: d, dias: dias(d.aprovadoEm || d.data) })
    else if (d.status === 'enviado') {
      const venceu = d.validadeDias && somarDias(d.data, d.validadeDias) < hoje
      const espera = dias(d.enviadoEm || d.data)
      if (!venceu && espera >= 2) lembrar.push({ doc: d, dias: espera })
    }
  }
  const ordem = (a, b) => b.dias - a.dias
  return { cobrar: cobrar.sort(ordem), lembrar: lembrar.sort(ordem), totalCobrar: cobrar.reduce((s, c) => s + totais(c.doc).total, 0) }
}

export const TONS = {
  gentil: 'Gentil',
  direto: 'Direto',
  firme: 'Último aviso',
}

export function mensagemCobranca(doc, perfil, link, tom = 'gentil') {
  const nome = (doc.cliente?.nome || '').split(' ')[0]
  const oi = `Olá${nome ? ', ' + nome : ''}!`
  const num = String(doc.numero).padStart(4, '0')
  const valor = dinheiro(totais(doc).total)
  const pix = perfil.pixChave ? `\n\nChave Pix: ${perfil.pixChave}${perfil.pixNome ? ` (${perfil.pixNome})` : ''}` : ''
  const pagar = `\n\nVocê paga pelo link, com QR Code Pix e o valor já preenchido:\n${link}${pix}`
  const fim = `\n\n${perfil.nome}`
  if (tom === 'direto') return `${oi} O pagamento do serviço (orçamento nº ${num}) no valor de ${valor} ainda está em aberto.${pagar}\n\nMe avisa quando fizer, por favor.${fim}`
  if (tom === 'firme') return `${oi} Ainda não identifiquei o pagamento do orçamento nº ${num}, de ${valor}. Peço que regularize até amanhã, por favor.${pagar}\n\nSe já pagou, me mande o comprovante e desconsidere esta mensagem.${fim}`
  return `${oi} Tudo bem? Passando só para lembrar do pagamento do orçamento nº ${num}, no valor de ${valor}. 😊${pagar}\n\nObrigado!${fim}`
}

export function mensagemLembrete(doc, perfil, link) {
  const nome = (doc.cliente?.nome || '').split(' ')[0]
  const num = String(doc.numero).padStart(4, '0')
  return `Olá${nome ? ', ' + nome : ''}! Tudo bem? Conseguiu ver o orçamento nº ${num} que te mandei (${dinheiro(totais(doc).total)})?\n\n${link}\n\nSe quiser, posso ajustar alguma coisa ou já combinar a data. 😉\n\n${perfil.nome}`
}
