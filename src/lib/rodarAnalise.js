import { supabase } from './supabase'
import { analisarConversa } from './analisaIA'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000

async function buscarConversasParaAnalisar(modo) {
  let query = supabase
    .from('ci_conversas')
    .select('id, contato_nome, contato_numero, consultora, datacrazy_id, tempo_resposta_medio')
    .gt('total_mensagens', 0)

  if (modo === 'teste') {
    query = query.order('ultima_mensagem_at', { ascending: false }).limit(50)
  } else if (modo === 'recentes') {
    const limite = new Date(Date.now() - TRINTA_DIAS_MS).toISOString()
    query = query
      .is('score_ia', null)
      .gte('ultima_mensagem_at', limite)
      .order('ultima_mensagem_at', { ascending: false })
  } else {
    query = query
      .is('score_ia', null)
      .order('ultima_mensagem_at', { ascending: false })
  }

  const { data, error } = await query
  if (error) throw new Error('Erro ao buscar conversas: ' + error.message)
  return data ?? []
}

export async function rodarAnaliseModo(modo = 'teste', onLog = () => {}, onCancel = null, onProgress = null) {
  const DELAY_MS = 500
  let concluidas = 0
  let erros = 0
  const resultados = []
  const tempoInicio = Date.now()

  onLog(`ℹ Modo análise: ${modo.toUpperCase()}`)

  let conversas
  try {
    conversas = await buscarConversasParaAnalisar(modo)
  } catch (err) {
    onLog(`✗ ${err.message}`)
    return { concluidas: 0, erros: 0, total: 0, resultados, duracaoMs: 0 }
  }

  const total = conversas.length
  onLog(`ℹ ${total} conversas para analisar.`)

  if (total === 0) {
    onLog('✓ Nenhuma conversa pendente neste modo.')
    return { concluidas: 0, erros: 0, total: 0, resultados, duracaoMs: 0 }
  }

  for (const conv of conversas) {
    if (onCancel && onCancel()) {
      onLog('⛔ Análise interrompida pelo usuário.')
      break
    }

    const nome = conv.contato_nome || conv.contato_numero || conv.id
    onLog(`ℹ Analisando [${concluidas + 1}/${total}]: ${nome}`)

    try {
      const { data: mensagens, error: errMsg } = await supabase
        .from('ci_mensagens')
        .select('de, conteudo, tipo, transcricao, enviado_at')
        .eq('conversa_id', conv.id)
        .order('enviado_at', { ascending: true })

      if (errMsg) throw new Error(errMsg.message)

      if (!mensagens || mensagens.length < 2) {
        onLog(`⚠ Pulando ${nome} — sem conteúdo suficiente (${mensagens?.length ?? 0} msgs)`)
        concluidas++
        if (onProgress) onProgress({ atual: concluidas, total, concluidas, erros, pct: Math.round((concluidas / total) * 100) })
        await delay(50)
        continue
      }

      const analise = await analisarConversa(mensagens, conv.consultora ?? 'Sem atendente')

      if (!analise) {
        onLog(`⚠ Sem resultado para ${nome}`)
        erros++
        if (onProgress) onProgress({ atual: concluidas, total, concluidas, erros })
        await delay(DELAY_MS)
        continue
      }

      const { error: errUpdate } = await supabase
        .from('ci_conversas')
        .update({
          score_ia: analise.score_ia,
          classificacao_ia: analise.classificacao_ia,
          chance_fechamento: analise.chance_fechamento,
          resumo_ia: analise.resumo_ia,
          objecoes_detectadas: analise.objecoes_detectadas ?? [],
          erros_consultora: analise.erros_consultora ?? [],
          sugestoes_ia: analise.sugestoes_ia ?? [],
          proxima_melhor_resposta: analise.proxima_melhor_resposta,
          estado_consultora: analise.estado_consultora ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conv.id)

      if (errUpdate) throw new Error(errUpdate.message)

      concluidas++
      const resultado = {
        id: conv.id,
        contato_nome: conv.contato_nome,
        contato_numero: conv.contato_numero,
        consultora: conv.consultora,
        score_ia: analise.score_ia,
        classificacao_ia: analise.classificacao_ia,
        chance_fechamento: analise.chance_fechamento,
        estado_consultora: analise.estado_consultora ?? null,
        tempo_resposta_medio: conv.tempo_resposta_medio,
      }
      resultados.push(resultado)

      const pct = Math.round((concluidas / total) * 100)
      onLog(`✓ ${nome} → score: ${analise.score_ia} | ${analise.classificacao_ia} | ${analise.chance_fechamento}% chance`)
      if (onProgress) onProgress({ atual: concluidas, total, concluidas, erros, pct, ultimoResultado: resultado })

    } catch (err) {
      erros++
      onLog(`✗ Erro em ${nome}: ${err.message}`)
      if (onProgress) onProgress({ atual: concluidas, total, concluidas, erros })
    }

    await delay(DELAY_MS)
  }

  const duracaoMs = Date.now() - tempoInicio
  const mins = Math.floor(duracaoMs / 60000)
  const segs = Math.round((duracaoMs % 60000) / 1000)
  onLog(`✓ Análise encerrada: ${concluidas} processadas | ${erros} erros | ${mins}min ${segs}s`)

  return { concluidas, erros, total, resultados, duracaoMs }
}

export async function contarPendentes() {
  const { count } = await supabase
    .from('ci_conversas')
    .select('*', { count: 'exact', head: true })
    .is('score_ia', null)
  return count ?? 0
}

export async function contarAnalisadas() {
  const { count } = await supabase
    .from('ci_conversas')
    .select('*', { count: 'exact', head: true })
    .not('score_ia', 'is', null)
  return count ?? 0
}

export async function rodarAnaliseIA(onLog = () => {}, onCancel = null, onProgress = null) {
  const LOTE = 100
  const DELAY_MS = 500

  let concluidas = 0
  let erros = 0
  const resultados = []
  const tempoInicio = Date.now()

  onLog('ℹ Iniciando motor de análise IA...')

  // Contar total pendente
  const total = await contarPendentes()
  onLog(`ℹ ${total} conversas aguardando análise.`)

  if (total === 0) {
    onLog('✓ Todas as conversas já foram analisadas.')
    return { concluidas: 0, erros: 0, total: 0, resultados, duracaoMs: 0 }
  }

  let offset = 0

  while (true) {
    if (onCancel && onCancel()) {
      onLog('⛔ Análise interrompida pelo usuário.')
      break
    }

    // Buscar lote de conversas pendentes
    const { data: conversas, error: errConv } = await supabase
      .from('ci_conversas')
      .select('id, contato_nome, contato_numero, consultora, datacrazy_id')
      .is('score_ia', null)
      .order('ultima_mensagem_at', { ascending: false })
      .range(offset, offset + LOTE - 1)

    if (errConv) {
      onLog(`✗ Erro ao buscar conversas: ${errConv.message}`)
      break
    }

    if (!conversas || conversas.length === 0) {
      onLog('ℹ Nenhuma conversa pendente restante.')
      break
    }

    onLog(`ℹ Lote: ${conversas.length} conversas (offset ${offset})`)

    for (const conv of conversas) {
      if (onCancel && onCancel()) {
        onLog('⛔ Análise interrompida pelo usuário.')
        break
      }

      const nome = conv.contato_nome || conv.contato_numero || conv.id
      onLog(`ℹ Analisando: ${nome} (consultora: ${conv.consultora ?? '?'})`)

      try {
        // Buscar mensagens da conversa
        const { data: mensagens, error: errMsg } = await supabase
          .from('ci_mensagens')
          .select('de, conteudo, tipo, transcricao, enviado_at')
          .eq('conversa_id', conv.id)
          .order('enviado_at', { ascending: true })

        if (errMsg) throw new Error(errMsg.message)

        if (!mensagens || mensagens.length < 2) {
          onLog(`⚠ Pulando ${nome} — menos de 2 mensagens`)
          concluidas++
          if (onProgress) onProgress({ atual: concluidas, total, concluidas, erros })
          await delay(50)
          continue
        }

        const analise = await analisarConversa(mensagens, conv.consultora ?? 'Sem atendente')

        if (!analise) {
          onLog(`⚠ Sem resultado para ${nome}`)
          erros++
          if (onProgress) onProgress({ atual: concluidas, total, concluidas, erros })
          await delay(DELAY_MS)
          continue
        }

        // Salvar no Supabase
        const { error: errUpdate } = await supabase
          .from('ci_conversas')
          .update({
            score_ia: analise.score_ia,
            classificacao_ia: analise.classificacao_ia,
            chance_fechamento: analise.chance_fechamento,
            resumo_ia: analise.resumo_ia,
            objecoes_detectadas: analise.objecoes_detectadas ?? [],
            erros_consultora: analise.erros_consultora ?? [],
            sugestoes_ia: analise.sugestoes_ia ?? [],
            proxima_melhor_resposta: analise.proxima_melhor_resposta,
            estado_consultora: analise.estado_consultora ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', conv.id)

        if (errUpdate) throw new Error(errUpdate.message)

        concluidas++
        resultados.push({
          id: conv.id,
          contato_nome: conv.contato_nome,
          contato_numero: conv.contato_numero,
          consultora: conv.consultora,
          score_ia: analise.score_ia,
          classificacao_ia: analise.classificacao_ia,
          chance_fechamento: analise.chance_fechamento,
        })

        const pct = Math.round((concluidas / total) * 100)
        onLog(`✓ ${nome} → score: ${analise.score_ia} | ${analise.classificacao_ia} | ${analise.chance_fechamento}% chance`)
        if (onProgress) onProgress({ atual: concluidas, total, concluidas, erros, pct, ultimoResultado: resultados[resultados.length - 1] })

      } catch (err) {
        erros++
        onLog(`✗ Erro em ${nome}: ${err.message}`)
        if (onProgress) onProgress({ atual: concluidas, total, concluidas, erros })
      }

      await delay(DELAY_MS)
    }

    // Verificar cancelamento após loop interno
    if (onCancel && onCancel()) break

    // Se o lote retornou menos que LOTE, chegamos ao fim
    if (conversas.length < LOTE) {
      onLog('ℹ Todas as conversas do lote processadas.')
      break
    }

    // Não incrementa offset — a query sempre filtra score_ia IS NULL,
    // então conversas já analisadas saem automaticamente da lista
    onLog(`ℹ Aguardando próximo lote...`)
    await delay(1000)
  }

  const duracaoMs = Date.now() - tempoInicio
  const mins = Math.floor(duracaoMs / 60000)
  const segs = Math.round((duracaoMs % 60000) / 1000)
  onLog(`✓ Análise encerrada: ${concluidas} processadas | ${erros} erros | ${mins}min ${segs}s`)

  return { concluidas, erros, total, resultados, duracaoMs }
}
