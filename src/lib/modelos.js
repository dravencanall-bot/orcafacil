// Modelos prontos: o profissional escolhe um e o orçamento já vem montado.
// Os valores ficam em branco de propósito (cada um coloca o seu preço);
// se o serviço já foi usado antes, o app puxa o último preço sozinho.
const s = (desc, qtd = '1') => ({ desc, qtd, valor: '', tipo: 'servico' })
const m = (desc, qtd = '1') => ({ desc, qtd, valor: '', tipo: 'material' })

export const MODELOS = [
  {
    id: 'ar-instalacao', nome: 'Ar-condicionado: instalação',
    itens: [
      s('Instalação de ar-condicionado split 12.000 BTUs'),
      s('Infraestrutura (passagem de tubulação e dreno)'),
      m('Tubulação de cobre isolada (metro)', '3'),
      m('Suporte para condensadora'),
      m('Cabo elétrico PP (metro)', '5'),
      m('Mangueira de dreno (metro)', '3'),
    ],
    garantia: '90 dias na instalação (não inclui defeito de fábrica do aparelho)',
    prazo: '1 dia',
    obs: 'Ponto elétrico e disjuntor exclusivos por conta do cliente, se ainda não houver.\nFuro em parede de concreto ou acima de 3 m pode ter custo adicional.',
  },
  {
    id: 'ar-limpeza', nome: 'Ar-condicionado: limpeza',
    itens: [
      s('Limpeza completa (higienização) split até 12.000 BTUs'),
      s('Aplicação de bactericida'),
    ],
    garantia: '30 dias no serviço',
    prazo: 'Cerca de 2 horas por aparelho',
    obs: 'Recomendado a cada 6 meses para economia de energia e saúde.',
  },
  {
    id: 'ar-manutencao', nome: 'Ar-condicionado: conserto',
    itens: [
      s('Visita técnica e diagnóstico'),
      s('Recarga de gás refrigerante'),
      m('Gás refrigerante (kg)'),
    ],
    garantia: '90 dias no serviço e nas peças trocadas',
    prazo: '1 dia',
    obs: 'Se o orçamento for aprovado, o valor da visita é descontado.',
  },
  {
    id: 'eletrica', nome: 'Eletricista',
    itens: [s('Troca de disjuntor'), s('Instalação de tomada'), m('Disjuntor'), m('Tomada 10A')],
    garantia: '90 dias no serviço', prazo: '1 dia', obs: '',
  },
  {
    id: 'pintura', nome: 'Pintura',
    itens: [s('Pintura de parede (m²)', '30'), s('Preparação: lixa e massa corrida'), m('Tinta acrílica 18 L'), m('Massa corrida, lixa e fita')],
    garantia: '6 meses na mão de obra', prazo: '3 dias', obs: 'Móveis devem estar afastados ou cobertos antes do início.',
  },
  {
    id: 'encanador', nome: 'Encanador',
    itens: [s('Conserto de vazamento'), s('Troca de torneira/registro'), m('Peças e conexões')],
    garantia: '90 dias no serviço', prazo: '1 dia', obs: '',
  },
]

// Orçamento de exemplo (página #/exemplo), para mostrar ao profissional como o cliente recebe.
export const EXEMPLO = {
  perfil: {
    nome: 'Clima Frio Instalações', profissao: 'Instalação e manutenção de ar-condicionado',
    telefone: '', cidade: 'Campinas - SP', documento: '', cor: '#1d4ed8', logo: '',
  },
  doc: {
    tipo: 'orcamento', numero: 27, data: null, validadeDias: 15,
    cliente: { nome: 'Carla Mendes', telefone: '', endereco: 'Rua das Flores, 120 - Cambuí' },
    itens: [
      { desc: 'Instalação de ar-condicionado split 12.000 BTUs', qtd: '1', valor: '450', tipo: 'servico' },
      { desc: 'Infraestrutura (passagem de tubulação e dreno)', qtd: '1', valor: '150', tipo: 'servico' },
      { desc: 'Tubulação de cobre isolada (metro)', qtd: '3', valor: '75', tipo: 'material' },
      { desc: 'Suporte para condensadora', qtd: '1', valor: '90', tipo: 'material' },
      { desc: 'Cabo elétrico PP (metro)', qtd: '5', valor: '8', tipo: 'material' },
    ],
    desconto: '35',
    pagamento: '50% na aprovação e 50% ao final, via Pix ou cartão',
    garantia: '90 dias na instalação',
    prazo: '1 dia (agendamento em até 3 dias úteis)',
    obs: 'Ponto elétrico exclusivo por conta do cliente.',
  },
}
