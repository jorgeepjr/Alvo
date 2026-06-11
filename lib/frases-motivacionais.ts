export const FRASES_MOTIVACIONAIS = [
  'Cada "não" te aproxima do próximo "sim". Vai com tudo hoje! 💪',
  'Atendimento de qualidade é a melhor propaganda da loja.',
  'Sorria, cumprimente, encante. Cliente bem tratado volta — e traz amigas.',
  'Foco na meta de hoje: pequenas vitórias diárias formam grandes resultados.',
  'Pergunte sempre: "posso te mostrar mais uma peça que combina com isso?"',
  'Quem prospecta hoje, vende amanhã. Não deixe a agenda vazia.',
  'O segredo do ticket médio: sugerir o complemento certo no momento certo.',
  'Cliente satisfeito é cliente que indica. Capriche no pós-venda!',
  'Hoje é um ótimo dia para bater a meta. Bora começar com energia!',
  'Conhecimento do produto vende mais que qualquer desconto.',
  'Organização gera confiança. Loja arrumada, vendas em dia, cabeça tranquila.',
  'Cada cliente é uma nova chance de criar uma ótima experiência.',
  'Não espere o cliente pedir — antecipe o que ele precisa.',
  'Disciplina na rotina hoje é resultado garantido amanhã.',
  'Acredite: você é capaz de superar a meta de hoje!',
] as const

export function fraseDoDia(data: Date = new Date()): string {
  const inicioAno = new Date(data.getFullYear(), 0, 0)
  const diff = data.getTime() - inicioAno.getTime()
  const diaDoAno = Math.floor(diff / 86400000)
  return FRASES_MOTIVACIONAIS[diaDoAno % FRASES_MOTIVACIONAIS.length]
}
