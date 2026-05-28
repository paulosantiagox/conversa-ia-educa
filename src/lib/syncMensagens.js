import { supabase } from './supabase'
import { syncMensagensConversa } from './syncDataCrazy'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

const TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000

export function estimarTempo(modo) {
  const map = {
    teste:       '~1 minuto',
    ultimas_24h: '~5–15 minutos',
    recentes:    '~30–90 minutos',
    completo:    '~4 horas',
  }
  return map[modo] ?? '?'
}

const VINTE_QUATRO_H_MS = 24 * 60 * 60 * 1000

async function buscarConversasModo(modo) {
  let query = supabase
    .from('ci_conversas')
    .select('id, datacrazy_id, contato_nome, contato_numero, consultora, total_mensagens, ultima_mensagem_at')
    .not('datacrazy_id', 'is', null)

  if (modo === 'teste') {
    // 50 mais recentes, independente de ter mensagens
    query = query.order('ultima_mensagem_at', { ascending: false }).limit(50)
  } else if (modo === 'ultimas_24h') {
    // Conversas ativas nas últimas 24h — usado pelo auto-sync (rápido)
    const limite = new Date(Date.now() - VINTE_QUATRO_H_MS).toISOString()
    query = query
      .gte('ultima_mensagem_at', limite)
      .order('ultima_mensagem_at', { ascending: false })
  } else if (modo === 'recentes') {
    // Todos os últimos 30 dias — inclui conversas que já tinham mensagens
    const limite = new Date(Date.now() - TRINTA_DIAS_MS).toISOString()
    query = query
      .gte('ultima_mensagem_at', limite)
      .order('ultima_mensagem_at', { ascending: false })
  } else {
    // completo — backfill de conversas que nunca tiveram mensagens importadas
    query = query
      .eq('total_mensagens', 0)
      .order('ultima_mensagem_at', { ascending: false })
  }

  const { data, error } = await query
  if (error) throw new Error('Erro ao buscar conversas: ' + error.message)
  return data ?? []
}

const LOTE = 1000

export async function syncMensagensModo(modo = 'teste', onLog = () => {}, onCancel = null, onProgress = null) {
  onLog(`ℹ Modo: ${modo.toUpperCase()} — ${estimarTempo(modo)}`)

  let mensagensImportadas = 0
  let erros = 0
  let processados = 0

  // Teste e recentes: busca única sem loop
  if (modo !== 'completo') {
    let conversas
    try {
      conversas = await buscarConversasModo(modo)
    } catch (err) {
      onLog(`✗ ${err.message}`)
      return { total: 0, mensagensImportadas: 0, erros: 0 }
    }

    const total = conversas.length
    onLog(`ℹ ${total} conversas selecionadas para sync de mensagens.`)
    if (total === 0) { onLog('✓ Nenhuma conversa pendente neste modo.'); return { total: 0, mensagensImportadas: 0, erros: 0 } }

    for (const conv of conversas) {
      if (onCancel?.()) { onLog('⛔ Sync de mensagens interrompido pelo usuário.'); break }
      const nome = conv.contato_nome || conv.contato_numero || conv.id
      try {
        const { total: imp, erros: e } = await syncMensagensConversa(conv, onLog)
        mensagensImportadas += imp; erros += e
        onLog(`✓ [${processados + 1}/${total}] ${nome}${imp > 0 ? ` → ${imp} novas` : ''}`)
      } catch (err) {
        erros++
        onLog(`✗ Erro em ${nome}: ${err.message}`)
      }
      processados++
      onProgress?.({ atual: processados, total, mensagensImportadas, erros, pct: Math.round((processados / total) * 100) })
      await delay(1000)
    }

    onLog(`✓ Sync mensagens concluído: ${mensagensImportadas} importadas | ${erros} erros`)
    return { total: processados, mensagensImportadas, erros }
  }

  // COMPLETO: loop em lotes de 1000 até zerar pendentes
  const totalPendentes = await supabase
    .from('ci_conversas').select('*', { count: 'exact', head: true })
    .not('datacrazy_id', 'is', null).eq('total_mensagens', 0)
  const total = totalPendentes.count ?? 0
  onLog(`ℹ ${total} conversas pendentes no total`)

  while (true) {
    if (onCancel?.()) { onLog('⛔ Sync de mensagens interrompido pelo usuário.'); break }

    let lote
    try {
      const { data, error } = await supabase
        .from('ci_conversas')
        .select('id, datacrazy_id, contato_nome, contato_numero, consultora, total_mensagens, ultima_mensagem_at')
        .not('datacrazy_id', 'is', null)
        .eq('total_mensagens', 0)
        .order('ultima_mensagem_at', { ascending: false })
        .limit(LOTE)
      if (error) { onLog(`✗ ${error.message}`); break }
      lote = data ?? []
    } catch (err) {
      onLog(`✗ ${err.message}`); break
    }

    if (!lote.length) { onLog('ℹ Nenhuma conversa pendente restante.'); break }
    onLog(`ℹ Lote: ${lote.length} conversas (${processados} processadas até agora)`)

    for (const conv of lote) {
      if (onCancel?.()) { onLog('⛔ Sync de mensagens interrompido pelo usuário.'); break }
      const nome = conv.contato_nome || conv.contato_numero || conv.id
      try {
        const { total: imp, erros: e } = await syncMensagensConversa(conv, onLog)
        mensagensImportadas += imp; erros += e
        onLog(`✓ [${processados + 1}/${total}] ${nome}${imp > 0 ? ` → ${imp} novas` : ''}`)
      } catch (err) {
        erros++
        onLog(`✗ Erro em ${nome}: ${err.message}`)
      }
      processados++
      onProgress?.({ atual: processados, total, mensagensImportadas, erros, pct: Math.round((processados / total) * 100) })
      await delay(1000)
    }

    if (onCancel?.()) break
    if (lote.length < LOTE) break
  }

  onLog(`✓ Sync mensagens concluído: ${mensagensImportadas} importadas | ${erros} erros`)
  return { total: processados, mensagensImportadas, erros }
}
