import { supabase } from './supabase'
import { fetchConversations, isEJA } from './datacrazy'

const AMOSTRA_TAMANHO = 50

export async function verificarCobertura(addLog = () => {}) {
  try {
    addLog('Contando conversas no banco...')
    const { count: totalBanco, error: errCount } = await supabase
      .from('ci_conversas')
      .select('*', { count: 'exact', head: true })
      .not('datacrazy_id', 'is', null)
    if (errCount) throw errCount

    addLog(`Total no banco: ${(totalBanco ?? 0).toLocaleString('pt-BR')} conversas`)
    addLog(`Verificando amostra de ${AMOSTRA_TAMANHO} conversas na API...`)

    const resposta = await fetchConversations(0, AMOSTRA_TAMANHO)
    const conversas = resposta?.data ?? resposta?.conversations ?? []
    const amostra = conversas.filter(isEJA)

    if (amostra.length === 0) {
      addLog('Nenhuma conversa EJA encontrada na amostra.')
      return { totalBanco: totalBanco ?? 0, totalFaltando: 0 }
    }

    const ids = amostra.map((c) => String(c.id ?? c.datacrazy_id)).filter(Boolean)
    const { data: encontrados } = await supabase
      .from('ci_conversas')
      .select('datacrazy_id')
      .in('datacrazy_id', ids)

    const idsNoBanco = new Set((encontrados ?? []).map((r) => String(r.datacrazy_id)))
    const faltando = ids.filter((id) => !idsNoBanco.has(id))

    addLog(`Amostra: ${amostra.length} | No banco: ${idsNoBanco.size} | Faltando: ${faltando.length}`)

    return { totalBanco: totalBanco ?? 0, totalFaltando: faltando.length }
  } catch (err) {
    addLog(`Erro: ${err?.message ?? String(err)}`)
    return { totalBanco: 0, totalFaltando: 0 }
  }
}
