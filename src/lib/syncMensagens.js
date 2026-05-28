import { supabase } from './supabase'
import { syncMensagensConversa } from './syncDataCrazy'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

const TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000
const VINTE_QUATRO_H_MS = 24 * 60 * 60 * 1000
const LOTE = 500  // lote por página para evitar timeout no Supabase

export function estimarTempo(modo) {
  const map = {
    teste:       '~1 minuto',
    ultimas_24h: '~2–5 minutos',
    recentes:    '~10–30 minutos',
    completo:    '~2–4 horas',
  }
  return map[modo] ?? '?'
}

// Conta quantas conversas precisam de sync no modo
export async function contarPendentes(modo) {
  let query = supabase
    .from('ci_conversas')
    .select('*', { count: 'exact', head: true })
    .not('datacrazy_id', 'is', null)

  if (modo === 'teste') {
    return 50
  } else if (modo === 'ultimas_24h') {
    const limite = new Date(Date.now() - VINTE_QUATRO_H_MS).toISOString()
    query = query
      .gte('ultima_mensagem_at', limite)
      .or('mensagens_sync_at.is.null,ultima_mensagem_at.gt.mensagens_sync_at')
  } else if (modo === 'recentes') {
    const limite = new Date(Date.now() - TRINTA_DIAS_MS).toISOString()
    query = query
      .gte('ultima_mensagem_at', limite)
      .or('mensagens_sync_at.is.null,ultima_mensagem_at.gt.mensagens_sync_at')
  } else {
    // completo
    query = query
      .or('mensagens_sync_at.is.null,ultima_mensagem_at.gt.mensagens_sync_at')
  }

  const { count } = await query
  return count ?? 0
}

// Busca um lote de conversas que precisam de sync
async function buscarLote(modo, offset = 0) {
  let query = supabase
    .from('ci_conversas')
    .select('id, datacrazy_id, contato_nome, contato_numero, consultora, total_mensagens, ultima_mensagem_at, mensagens_sync_at')
    .not('datacrazy_id', 'is', null)
    .order('ultima_mensagem_at', { ascending: false })
    .range(offset, offset + LOTE - 1)

  if (modo === 'teste') {
    // Teste: 50 mais recentes sem filtro de pendência
    return supabase
      .from('ci_conversas')
      .select('id, datacrazy_id, contato_nome, contato_numero, consultora, total_mensagens, ultima_mensagem_at, mensagens_sync_at')
      .not('datacrazy_id', 'is', null)
      .order('ultima_mensagem_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) throw new Error(error.message)
        return data ?? []
      })
  }

  if (modo === 'ultimas_24h') {
    const limite = new Date(Date.now() - VINTE_QUATRO_H_MS).toISOString()
    query = query
      .gte('ultima_mensagem_at', limite)
      .or('mensagens_sync_at.is.null,ultima_mensagem_at.gt.mensagens_sync_at')
  } else if (modo === 'recentes') {
    const limite = new Date(Date.now() - TRINTA_DIAS_MS).toISOString()
    query = query
      .gte('ultima_mensagem_at', limite)
      .or('mensagens_sync_at.is.null,ultima_mensagem_at.gt.mensagens_sync_at')
  } else {
    // completo — tudo que nunca foi sincronizado ou teve msg nova
    query = query
      .or('mensagens_sync_at.is.null,ultima_mensagem_at.gt.mensagens_sync_at')
  }

  const { data, error } = await query
  if (error) throw new Error('Erro ao buscar conversas: ' + error.message)
  return data ?? []
}

export async function syncMensagensModo(modo = 'teste', onLog = () => {}, onCancel = null, onProgress = null) {
  onLog(`ℹ Modo: ${modo.toUpperCase()} — ${estimarTempo(modo)}`)

  let mensagensImportadas = 0
  let erros = 0
  let processados = 0

  // TESTE: busca única, 50 conversas, sem checar pendência
  if (modo === 'teste') {
    let conversas
    try { conversas = await buscarLote('teste') } catch (err) {
      onLog(`✗ ${err.message}`)
      return { total: 0, mensagensImportadas: 0, erros: 0 }
    }
    const total = conversas.length
    onLog(`ℹ ${total} conversas selecionadas.`)
    if (total === 0) { onLog('✓ Nenhuma conversa pendente.'); return { total: 0, mensagensImportadas: 0, erros: 0 } }

    for (const conv of conversas) {
      if (onCancel?.()) { onLog('⛔ Sync interrompido.'); break }
      const nome = conv.contato_nome || conv.contato_numero || conv.id
      try {
        const { total: imp, erros: e } = await syncMensagensConversa(conv, onLog)
        mensagensImportadas += imp; erros += e
        onLog(`✓ [${processados + 1}/${total}] ${nome}${imp > 0 ? ` → ${imp} novas` : ' (sem novas)'}`)
      } catch (err) { erros++; onLog(`✗ Erro em ${nome}: ${err.message}`) }
      processados++
      onProgress?.({ atual: processados, total, mensagensImportadas, erros, pct: Math.round((processados / total) * 100) })
      await delay(1000)
    }
    onLog(`✓ Sync concluído: ${mensagensImportadas} importadas | ${erros} erros`)
    return { total: processados, mensagensImportadas, erros }
  }

  // RECENTES / ULTIMAS_24H / COMPLETO: paginação em lotes de 500
  // Conta total pendente para mostrar progresso real
  let total = 0
  try {
    total = await contarPendentes(modo)
    onLog(`ℹ ${total} conversas com mensagens novas para sincronizar.`)
    if (total === 0) { onLog('✓ Tudo já está atualizado!'); return { total: 0, mensagensImportadas: 0, erros: 0 } }
  } catch (err) {
    onLog(`⚠ Não foi possível contar pendentes: ${err.message}`)
  }

  let offset = 0
  while (true) {
    if (onCancel?.()) { onLog('⛔ Sync de mensagens interrompido pelo usuário.'); break }

    let lote
    try {
      lote = await buscarLote(modo, offset)
    } catch (err) {
      onLog(`✗ ${err.message}`); break
    }

    if (!lote.length) { onLog('ℹ Todas as conversas sincronizadas.'); break }
    onLog(`ℹ Lote: ${lote.length} conversas (offset ${offset})`)

    for (const conv of lote) {
      if (onCancel?.()) { onLog('⛔ Sync de mensagens interrompido pelo usuário.'); break }
      const nome = conv.contato_nome || conv.contato_numero || conv.id
      try {
        const { total: imp, erros: e } = await syncMensagensConversa(conv, onLog)
        mensagensImportadas += imp; erros += e
        onLog(`✓ [${processados + 1}/${total || '?'}] ${nome}${imp > 0 ? ` → ${imp} novas` : ' (sem novas)'}`)
      } catch (err) {
        erros++
        onLog(`✗ Erro em ${nome}: ${err.message}`)
      }
      processados++
      const pct = total > 0 ? Math.round((processados / total) * 100) : null
      onProgress?.({ atual: processados, total: total || processados, mensagensImportadas, erros, pct })
      await delay(1000)
    }

    if (onCancel?.()) break

    // Se o lote veio menor que LOTE, chegamos no fim
    if (lote.length < LOTE) break

    // Não avança offset: como atualizamos mensagens_sync_at, as já processadas
    // saem do filtro e o próximo lote traz as próximas pendentes (offset=0 sempre)
  }

  onLog(`✓ Sync mensagens concluído: ${mensagensImportadas} importadas | ${erros} erros`)
  return { total: processados, mensagensImportadas, erros }
}
