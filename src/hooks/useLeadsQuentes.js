import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CONVERSAS } from '../lib/mockData'

const USE_MOCK = false

export function useLeadsQuentes() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (USE_MOCK) {
      setLeads(CONVERSAS.filter(c => c.classificacao_ia === 'quente' || c.score_ia >= 70)
        .sort((a, b) => b.score_ia - a.score_ia))
      setLoading(false)
      return
    }

    async function fetchLeads() {
      setLoading(true)
      setError(null)
      try {
        const { data, error: err } = await supabase
          .from('ci_conversas')
          .select('*')
          .or('classificacao_ia.eq.quente,score_ia.gte.70')
          .order('score_ia', { ascending: false })

        if (err) throw err
        setLeads(data || [])
      } catch (err) {
        console.error('[useLeadsQuentes] erro:', err.message || err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchLeads()
  }, [])

  return { leads, loading, error }
}
