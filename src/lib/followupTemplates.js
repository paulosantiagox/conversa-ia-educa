const KEY = 'conversia_followup_templates'

// Sequência recomendada: Caloroso → Curiosidade → Racional → Engraçado →
//                        Urgência → Provocativo → Silêncio → Desafiador → Direto
export const DEFAULTS = [
  {
    id: 'caloroso',
    titulo: 'Caloroso',
    emoji: '💬',
    instrucao: 'Tom caloroso, humano e acolhedor. Demonstre cuidado genuíno sem falar de venda. Adapte ao contexto real da conversa.',
    frases: [
      'oi, tudo bem com você?',
      'sumiu! tá tudo certo?',
      'lembrei de você hoje, como posso te ajudar?',
      'sem compromisso nenhum, só queria saber se ficou alguma dúvida',
    ],
  },
  {
    id: 'curiosidade',
    titulo: 'Curiosidade',
    emoji: '🤔',
    instrucao: 'Abra com um gancho curioso sem revelar o conteúdo. Deixe a pessoa querendo saber mais. Seja intrigante e breve.',
    frases: [
      'uma pergunta rápida',
      'posso te contar uma coisa?',
      'você sabia que dá pra fazer tudo pelo celular mesmo?',
      'tem uma informação que a maioria das pessoas não sabe sobre o EJA... posso te contar?',
    ],
  },
  {
    id: 'racional',
    titulo: 'Racional',
    emoji: '🧠',
    instrucao: 'Use argumento lógico e concreto para mostrar que a decisão é óbvia. Seja objetivo e direto.',
    frases: [
      'pensa: quanto tempo você já perdeu sem o certificado?',
      'divide por 12 no cartão fica menos de R$85 por mês. um jantar fora',
      'o certificado dura pra sempre. a dúvida não precisa durar',
      'você vai gastar mais tempo pensando do que fazendo. são só 45 dias',
    ],
  },
  {
    id: 'engracado',
    titulo: 'Engraçado',
    emoji: '😂',
    instrucao: 'Tom bem-humorado, leve e autodepreciativo. Quebre o gelo com humor suave. Máximo 1-2 linhas.',
    frases: [
      '🦗',
      'sumiu igual repelente',
      'tô aqui, você sumiu, a saudade tá grande 😅',
      'você me deixou no visto. isso dói 😔',
      'oi, sou eu de novo. o chato da sua vida 👋',
      'prometo que não mordo',
    ],
  },
  {
    id: 'urgencia',
    titulo: 'Urgência',
    emoji: '🎯',
    instrucao: 'Crie senso de urgência real e específico. Mencione o contexto da conversa se possível. Direto e sem enrolação.',
    frases: [
      'vagas limitadas esse mês',
      'o valor pode mudar em breve, queria te avisar',
      'última semana com esse preço',
      'tem 2 pessoas na sua frente querendo a mesma vaga. só avisando',
    ],
  },
  {
    id: 'provocativo',
    titulo: 'Provocativo',
    emoji: '😏',
    instrucao: 'Tom provocativo como um amigo que cutuca com bom humor. MÁXIMO 1 linha. Sem explicação longa.',
    frases: [
      'ainda pensando?',
      'o certificado não vai buscar você em casa',
      'enquanto você pensa, alguém já tá fazendo',
      'só curiosidade: o que tá travando?',
      'deixa eu adivinhar... ainda na dúvida né',
      'você abriu nossa conversa e não respondeu 👀 tô vendo',
    ],
  },
  {
    id: 'silencio',
    titulo: 'Silêncio estratégico',
    emoji: '😶',
    instrucao: 'Mensagem EXTREMAMENTE curta — 1 emoji ou o primeiro nome da pessoa. Nada mais. O silêncio é a estratégia.',
    frases: [
      '👋',
      '🟢',
      '...',
    ],
  },
  {
    id: 'desafiador',
    titulo: 'Desafiador',
    emoji: '🔥',
    instrucao: 'Desafie a pessoa a provar que é diferente da maioria. Tom de desafio respeitoso. Máximo 2 linhas.',
    frases: [
      'você consegue ou não consegue? simples assim',
      'tem gente que fala que quer mudar mas nunca muda. você é diferente?',
      'a maioria desiste antes de começar. você vai ser a exceção?',
      'daqui 3 meses você quer estar igual ou diferente?',
    ],
  },
  {
    id: 'direto',
    titulo: 'Direto / Fechamento',
    emoji: '⚡',
    instrucao: 'Peça uma decisão final de forma direta e respeitosa. Última tentativa. 1-2 linhas.',
    frases: [
      'sim ou não?',
      'vai fazer ou não vai?',
      'última vez que te mando mensagem. fica à vontade',
      'sem pressão, mas a turma desse mês tá quase fechando',
      'vou ser direto: você quer ou não quer o certificado?',
    ],
  },
]

export function getTemplates() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

export function saveTemplates(templates) {
  localStorage.setItem(KEY, JSON.stringify(templates))
}

export function resetTemplates() {
  localStorage.removeItem(KEY)
  return DEFAULTS
}

// Retorna todas as frases fixas de todos os templates em sequência
export function getAllFrases() {
  const templates = getTemplates()
  return templates.flatMap(t => (t.frases ?? []).map(frase => ({ frase, template: t })))
}
