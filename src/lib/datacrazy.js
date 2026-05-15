const BASE_URL = import.meta.env.VITE_DATACRAZY_BASE_URL
const API_KEY = import.meta.env.VITE_DATACRAZY_API_KEY

async function request(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  })
  if (!res.ok) throw new Error(`DataCrazy ${res.status}: ${path}`)
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
  }
}

export const delay = (ms) => new Promise((r) => setTimeout(r, ms))
