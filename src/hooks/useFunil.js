import { useMemo } from 'react'
import { CONVERSAS } from '../lib/mockData'

const USE_MOCK = true

const ETAPAS = ['aberta', 'negociando', 'recebeu_valor', 'recebeu_link', 'vendido', 'perdido']

export function useFunil() {
  const funil = useMemo(() => {
    if (!USE_MOCK) return {}

    return ETAPAS.reduce((acc, etapa) => {
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
  }, [])

  return { funil, etapas: ETAPAS }
}
