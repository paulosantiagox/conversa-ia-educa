const BASE_URL = import.meta.env.VITE_DATACRAZY_BASE_URL
const API_KEY = import.meta.env.VITE_DATACRAZY_API_KEY

async function request(path) {
  if (!BASE_URL || !API_KEY) {
    console.error('[DataCrazy] ENV faltando — BASE_URL:', !!BASE_URL, '| API_KEY:', !!API_KEY)
    throw new Error('DataCrazy: variáveis de ambiente ausentes (reinicie o dev server)')
  }
  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
  } catch (err) {
    console.error('[DataCrazy] Falha de rede/CORS em', path, '—', err.message)
    throw new Error(`DataCrazy: falha de rede (${err.message})`)
  }
  if (!res.ok) {
    const corpo = await res.text().catch(() => '')
    console.error(`[DataCrazy] HTTP ${res.status} ${res.statusText} em ${path}`, corpo.slice(0, 200))
    const dica = res.status === 429 ? ' (limite de requisições — aguarde 1 min)'
      : res.status === 401 ? ' (chave inválida ou expirada)'
      : ''
    throw new Error(`DataCrazy ${res.status}${dica}`)
  }
  return res.json()
}

export async function fetchConversations(skip = 0, take = 50) {
  return request(`/api/v1/conversations?take=${take}&skip=${skip}`)
}

export async function fetchMessages(conversationId) {
  return request(`/api/v1/conversations/${conversationId}/messages`)
}

export function isEJA(conversation) {
  return typeof conversation?.instance?.name === 'string' &&
    conversation.instance.name.startsWith('EEB')
}

export function mapConversation(conv) {
  const attendant = Array.isArray(conv.attendants) && conv.attendants.length > 0
    ? conv.attendants[0].name
    : 'Sem atendente'

  return {
    datacrazy_id: String(conv.id),
    contato_nome: conv.contact?.name ?? '',
    contato_numero: conv.contact?.phoneNumber ?? '',
    consultora: attendant,
    ultima_mensagem_at: conv.lastMessageDate ?? null,
    ultima_mensagem_texto: conv.lastMessage?.body ?? '',
    status: conv.finished ? 'fechada' : 'aberta',
    updated_at_dc: conv.updatedAt ?? conv.lastMessageDate ?? null,
    instancia: conv.instance?.name ?? null,
    instancia_numero: conv.instance?.phoneNumber ?? conv.instance?.phone ?? conv.instance?.number ?? null,
  }
}

export async function enviarMensagem(conversationId, texto) {
  const res = await fetch(`${BASE_URL}/api/v1/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body: texto }),
  })
  if (!res.ok) throw new Error(`DataCrazy ${res.status}: enviar mensagem`)
  return res.json()
}

export const delay = (ms) => new Promise((r) => setTimeout(r, ms))
