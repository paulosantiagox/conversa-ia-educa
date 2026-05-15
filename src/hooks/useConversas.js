import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CONVERSAS } from '../lib/mockData'

const USE_MOCK = false

export function useConversas(filtros = {}) {
  const [conversas, setConversas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (USE_MOCK) {
      setConversas(CONVERSAS)
      setLoading(false)
      return
    }

    async function fetchConversas() {
      setLoading(true)
      setError(null)
      try {
        let query = supabase
          .from('ci_conversas')
          .select('*')
          .gt('total_mensagens', 0)
          .order('ultima_mensagem_at', { ascending: false })
          .not('datacrazy_id', 'is', null)

        if (filtros.status) query = query.eq('status', filtros.status)
        if (filtros.consultora) query = query.eq('consultora', filtros.consultora)
        if (filtros.classificacao) query = query.eq('classificacao_ia', filtros.classificacao)
        if (filtros.busca) {
          query = query.or(
            `contato_nome.ilike.%${filtros.busca}%,contato_numero.ilike.%${filtros.busca}%,ultima_mensagem_texto.ilike.%${filtros.busca}%`
          )
        }

        const { data, error: err } = await query
        if (err) throw err
        setConversas(data || [])
      } catch (err) {
        console.error('[useConversas] erro:', err.message || err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchConversas()
  }, [filtros.status, filtros.consultora, filtros.classificacao, filtros.busca])

  return { conversas, loading, error }
}
