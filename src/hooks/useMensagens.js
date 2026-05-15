import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useMensagens(conversaId) {
  const [mensagens, setMensagens] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!conversaId) { setMensagens([]); return }

    setLoading(true)
    supabase
      .from('ci_mensagens')
      .select('*')
      .eq('conversa_id', conversaId)
      .order('enviado_at', { ascending: true })
      .then(({ data, error }) => {
        setMensagens((!error && Array.isArray(data)) ? data : [])
        setLoading(false)
      })
  }, [conversaId])

  return { mensagens, loading }
}
