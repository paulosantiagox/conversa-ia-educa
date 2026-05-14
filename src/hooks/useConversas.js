import { useState, useMemo } from 'react'
import { CONVERSAS } from '../lib/mockData'

const USE_MOCK = true

export function useConversas(filtros = {}) {
  const [loading] = useState(false)

  const conversas = useMemo(() => {
    if (!USE_MOCK) return []
    let data = [...CONVERSAS]

    if (filtros.status) data = data.filter(c => c.status === filtros.status)
    if (filtros.consultora) data = data.filter(c => c.consultora === filtros.consultora)
    if (filtros.classificacao) data = data.filter(c => c.classificacao_ia === filtros.classificacao)
    if (filtros.busca) {
      const b = filtros.busca.toLowerCase()
      data = data.filter(c =>
        c.contato_nome?.toLowerCase().includes(b) ||
        c.contato_numero?.includes(b) ||
        c.ultima_mensagem_texto?.toLowerCase().includes(b)
      )
    }

    return data.sort((a, b) => new Date(b.ultima_mensagem_at) - new Date(a.ultima_mensagem_at))
  }, [filtros])

  return { conversas, loading }
}
