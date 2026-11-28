// Números do mês: quanto orçou, fechou e recebeu.
import { totais } from './formato.js'

export const mesDe = (iso) => (iso || '').slice(0, 7)
export const mesAtual = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
export function mudarMes(mes, n) {
  const [a, m] = mes.split('-').map(Number)
  const d = new Date(a, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const nomeMes = (mes, curto = false) => {
  const n = MESES[Number(mes.slice(5, 7)) - 1] || ''
  return curto ? n.slice(0, 3) : n
}

// A data de quando ficou aprovado/pago; documentos antigos não têm, então usa a data do orçamento.
const quandoFechou = (d) => mesDe(d.aprovadoEm || d.pagoEm || d.data)
const quandoPagou = (d) => mesDe(d.pagoEm || d.data)

export function resumoDoMes(docs, mes) {
  const orc = docs.filter((d) => d.tipo !== 'recibo')
  const pagos = new Set(orc.filter((d) => d.status === 'pago').map((d) => d.id))
  const soma = (l) => l.reduce((s, d) => s + totais(d).total, 0)

  const orcados = orc.filter((d) => mesDe(d.data) === mes)
  const fechados = orc.filter((d) => ['aprovado', 'pago'].includes(d.status) && quandoFechou(d) === mes)
  const recebidosOrc = orc.filter((d) => d.status === 'pago' && quandoPagou(d) === mes)
  // Recibo feito a partir de um orçamento já marcado como pago não conta duas vezes.
  const recibos = docs.filter((d) => d.tipo === 'recibo' && mesDe(d.data) === mes && !pagos.has(d.origem))
  const aReceber = orc.filter((d) => d.status === 'aprovado')

  const servicos = {}
  for (const d of fechados) for (const i of d.itens || []) {
    const t = (i.desc || '').trim()
    if (t && i.tipo !== 'material') servicos[t] = (servicos[t] || 0) + 1
  }

  return {
    orcado: soma(orcados), qtdOrcado: orcados.length,
    fechado: soma(fechados), qtdFechado: fechados.length,
    recebido: soma(recebidosOrc) + soma(recibos), qtdRecebido: recebidosOrc.length + recibos.length,
    aReceber: soma(aReceber), qtdAReceber: aReceber.length,
    taxa: orcados.length ? Math.round((orcados.filter((d) => ['aprovado', 'pago'].includes(d.status)).length / orcados.length) * 100) : 0,
    ticket: fechados.length ? soma(fechados) / fechados.length : 0,
    topServicos: Object.entries(servicos).sort((a, b) => b[1] - a[1]).slice(0, 3),
  }
}

export function ultimosMeses(docs, mes, n = 6) {
  return Array.from({ length: n }, (_, i) => {
    const m = mudarMes(mes, i - n + 1)
    const r = resumoDoMes(docs, m)
    return { mes: m, recebido: r.recebido, fechado: r.fechado }
  })
}
