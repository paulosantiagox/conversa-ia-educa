import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 50

export function useConversas(filtros = {}) {
  const [conversas, setConversas] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState(null)
  const pageRef = useRef(0)
  const [refreshKey, setRefreshKey] = useState(0)

  function buildQuery(from, to) {
    let q = supabase
      .from('ci_conversas')
      .select('*', { count: 'exact' })
      .gt('total_mensagens', 0)
      .not('datacrazy_id', 'is', null)
      .order('ultima_mensagem_at', { ascending: false })
      .range(from, to)

    if (filtros.consultora) q = q.eq('consultora', filtros.consultora)
    if (filtros.classificacao) q = q.eq('classificacao_ia', filtros.classificacao)
    if (filtros.busca) q = q.or(
      `contato_nome.ilike.%${filtros.busca}%,contato_numero.ilike.%${filtros.busca}%,ultima_mensagem_texto.ilike.%${filtros.busca}%`
    )
    return q
  }

  useEffect(() => {
    pageRef.current = 0
    setConversas([])
    setHasMore(true)
    setTotal(null)

    async function fetchFirst() {
      setLoading(true)
      const { data, error, count } = await buildQuery(0, PAGE_SIZE - 1)
      if (!error) {
        setConversas(data ?? [])
        setTotal(count)
        setHasMore((data?.length ?? 0) === PAGE_SIZE)
        pageRef.current = 1
      }
      setLoading(false)
    }
    fetchFirst()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.consultora, filtros.classificacao, filtros.busca, refreshKey])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const from = pageRef.current * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    const { data, error } = await buildQuery(from, to)
    if (!error && data?.length) {
      setConversas(prev => [...prev, ...data])
      setHasMore(data.length === PAGE_SIZE)
      pageRef.current += 1
    } else {
      setHasMore(false)
    }
    setLoadingMore(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, hasMore, filtros.consultora, filtros.classificacao, filtros.busca])

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  return { conversas, loading, loadingMore, hasMore, total, loadMore, refresh }
}
