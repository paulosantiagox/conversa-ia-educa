import { supabase } from './supabase'
import { syncMensagensConversa } from './syncDataCrazy'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

const TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000

export function estimarTempo(modo) {
  const map = { teste: '~1 minuto', recentes: '~20–30 minutos', completo: '~4 horas' }
  return map[modo] ?? '?'
}

async function buscarConversasModo(modo) {
  let query = supabase
    .from('ci_conversas')
    .select('id, datacrazy_id, contato_nome, contato_numero, consultora, total_mensagens, ultima_mensagem_at')
    .not('datacrazy_id', 'is', null)

  if (modo === 'teste') {
    query = query.order('ultima_mensagem_at', { ascending: false }).limit(50)
  } else if (modo === 'recentes') {
    const limite = new Date(Date.now() - TRINTA_DIAS_MS).toISOString()
    query = query
      .gte('ultima_mensagem_at', limite)
      .eq('total_mensagens', 0)
      .order('ultima_mensagem_at', { ascending: false })
  } else {
    // completo
    query = query
      .eq('total_mensagens', 0)
      .order('ultima_mensagem_at', { ascending: false })
  }

  const { data, error } = await query
  if (error) throw new Error('Erro ao buscar conversas: ' + error.message)
  return data ?? []
}

export async function syncMensagensModo(modo = 'teste', onLog = () => {}, onCancel = null, onProgress = null) {
  onLog(`ℹ Modo: ${modo.toUpperCase()} — ${estimarTempo(modo)}`)

  let conversas
  try {
    conversas = await buscarConversasModo(modo)
  } catch (err) {
    onLog(`✗ ${err.message}`)
    return { total: 0, mensagensImportadas: 0, erros: 0 }
  }

  const total = conversas.length
  onLog(`ℹ ${total} conversas selecionadas para sync de mensagens.`)

  if (total === 0) {
    onLog('✓ Nenhuma conversa pendente neste modo.')
    return { total: 0, mensagensImportadas: 0, erros: 0 }
  }

  let atual = 0
  let mensagensImportadas = 0
  let erros = 0

  for (const conv of conversas) {
    if (onCancel && onCancel()) {
      onLog('⛔ Sync de mensagens interrompido pelo usuário.')
      break
    }

    const nome = conv.contato_nome || conv.contato_numero || conv.id
    onLog(`ℹ [${atual + 1}/${total}] ${nome}`)

    try {
      const { total: imp, erros: e } = await syncMensagensConversa(conv, onLog)
      mensagensImportadas += imp
      erros += e
      if (imp > 0) onLog(`✓ ${nome} → ${imp} mensagens`)
    } catch (err) {
      erros++
      onLog(`✗ Erro em ${nome}: ${err.message}`)
    }

    atual++
    const pct = Math.round((atual / total) * 100)
    if (onProgress) onProgress({ atual, total, mensagensImportadas, erros, pct })

    await delay(1000)
  }

  onLog(`✓ Sync mensagens concluído: ${mensagensImportadas} importadas | ${erros} erros`)
  return { total, mensagensImportadas, erros }
}
