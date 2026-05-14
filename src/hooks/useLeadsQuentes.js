import { useMemo } from 'react'
import { CONVERSAS } from '../lib/mockData'

const USE_MOCK = true

export function useLeadsQuentes() {
  const leads = useMemo(() => {
    if (!USE_MOCK) return []
    return CONVERSAS
      .filter(c => c.classificacao_ia === 'quente' || c.score_ia >= 70)
      .sort((a, b) => b.score_ia - a.score_ia)
  }, [])

  return { leads }
}
