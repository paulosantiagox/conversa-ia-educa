import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CONVERSAS } from '../lib/mockData'

const USE_MOCK = false

const ETAPAS = ['aberta', 'negociando', 'recebeu_valor', 'recebeu_link', 'vendido', 'perdido']

function classificarEtapa(conversa) {
  if (conversa.status === 'vendido') return 'vendido'
  if (conversa.status === 'perdido') return 'perdido'
  if (conversa.recebeu_link) return 'recebeu_link'
  if (conversa.recebeu_valor) return 'recebeu_valor'
  if (conversa.status === 'quente') return 'negociando'
  return 'aberta'
}

export function useFunil() {
  const [funil, setFunil] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (USE_MOCK) {
      const result = ETAPAS.reduce((acc, etapa) => {
        acc[etapa] = CONVERSAS.filter(c => {
          if (etapa === 'recebeu_valor') return c.recebeu_valor && !c.recebeu_link && c.status !== 'vendido' && c.status !== 'perdido'
          if (etapa === 'recebeu_link') return c.recebeu_link && c.status !== 'vendido' && c.status !== 'perdido'
          if (etapa === 'vendido') return c.status === 'vendido'
          if (etapa === 'perdido') return c.status === 'perdido'
          if (etapa === 'negociando') return c.status === 'quente' && !c.recebeu_valor
          return c.status === 'aberta' || (c.status === 'morno' && !c.recebeu_valor)
        })
        return acc
      }, {})
      setFunil(result)
      setLoading(false)
      return
    }

    async function fetchFunil() {
      setLoading(true)
      setError(null)
      try {
        const { data, error: err } = await supabase
          .from('ci_conversas')
          .select('*')
          .order('score_ia', { ascending: false })

        if (err) throw err

        const result = ETAPAS.reduce((acc, etapa) => { acc[etapa] = []; return acc }, {})
        for (const c of data || []) {
          const etapa = classificarEtapa(c)
          result[etapa].push(c)
        }
        setFunil(result)
      } catch (err) {
        console.error('[useFunil] erro:', err.message || err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchFunil()
  }, [])

  return { funil, etapas: ETAPAS, loading, error }
}
