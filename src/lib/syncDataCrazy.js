import { supabase } from './supabase'
import { fetchConversations, fetchMessages, isEJA, mapConversation, delay } from './datacrazy'

async function registrarInicio() {
  const { data, error } = await supabase
    .from('ci_sync_logs')
    .insert({ iniciado_at: new Date().toISOString(), status: 'rodando', conversas_importadas: 0, mensagens_importadas: 0, erros: 0 })
    .select('id')
    .single()
  if (error) throw new Error('Erro ao registrar início do sync: ' + error.message)
  return data.id
}

async function finalizarLog(logId, { conversas_importadas, erros, status }) {
  await supabase
    .from('ci_sync_logs')
    .update({ finalizado_at: new Date().toISOString(), conversas_importadas, mensagens_importadas: 0, erros, status })
    .eq('id', logId)
}

async function upsertConversa(mapped) {
  const { contato_numero, datacrazy_id, updated_at_dc, ...resto } = mapped
  if (!datacrazy_id || !contato_numero) return { acao: 'ignorada' }

  const { data: existente } = await supabase
    .from('ci_conversas')
    .select('id, updated_at')
    .eq('datacrazy_id', datacrazy_id)
    .maybeSingle()

  if (!existente) {
    const { error } = await supabase
      .from('ci_conversas')
      .insert({ datacrazy_id, contato_numero, ...resto, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    if (error) throw error
    return { acao: 'inserida' }
  }

  const dcUpdated = updated_at_dc ? new Date(updated_at_dc) : null
  const dbUpdated = existente.updated_at ? new Date(existente.updated_at) : null
  if (dcUpdated && dbUpdated && dcUpdated <= dbUpdated) return { acao: 'sem_mudanca' }

  const { error } = await supabase
    .from('ci_conversas')
    .update({ contato_numero, ...resto, updated_at: new Date().toISOString() })
    .eq('datacrazy_id', datacrazy_id)
  if (error) throw error
  return { acao: 'atualizada', id: existente.id }
}

export async function syncConversas(onLog = () => {}, onCancel = null, onProgress = null) {
  let logId = null
  const totais = { conversas_importadas: 0, atualizadas: 0, ignoradas: 0, erros: 0, status: 'concluido' }
  const erroIds = []
  const tempoInicio = Date.now()

  let totalEJA = 0
  let totalIgnoradas = 0
  let ejaTotalEst = null
  let totalPaginasEst = null
  let paginasVarridas = 0

  try {
    logId = await registrarInicio()
    onLog('ℹ Sync iniciado. Conectando à API DataCrazy...')

    const TAKE = 50
    let skip = 0
    let pagina = 1
    let processadas = 0
    const temposPagina = []

    while (true) {
      onLog(`ℹ Buscando página ${pagina} (skip=${skip})...`)
      const tPag = Date.now()
      const resultado = await fetchConversations(skip, TAKE)
      temposPagina.push(Date.now() - tPag)

      const items = Array.isArray(resultado) ? resultado
        : Array.isArray(resultado?.data) ? resultado.data
        : Array.isArray(resultado?.conversations) ? resultado.conversations
        : []

      if (items.length === 0) {
        onLog('ℹ Nenhuma conversa retornada — fim da paginação.')
        break
      }

      const eja = items.filter(isEJA)
      const ignoradas = items.length - eja.length
      totalEJA += eja.length
      totalIgnoradas += ignoradas
      paginasVarridas = pagina

      // Após primeira página: estimar total com base na proporção EJA e no total retornado pela API
      if (pagina === 1) {
        const apiTotal = resultado?.total ?? resultado?.meta?.total ?? resultado?.pagination?.total ?? null
        const ejaProporcao = items.length > 0 ? eja.length / items.length : 0.5
        if (apiTotal) {
          totalPaginasEst = Math.ceil(apiTotal / TAKE)
          ejaTotalEst = Math.round(apiTotal * ejaProporcao)
          onLog(`ℹ Estimativa: ~${ejaTotalEst} conversas EJA para importar (~${totalPaginasEst} páginas)`)
        }
      }

      onLog(`ℹ Página ${pagina}: ${items.length} total → ${eja.length} EJA | ${ignoradas} ignoradas (Autoflix/outros)`)

      // Emitir progresso e tempo estimado
      if (onProgress || totalPaginasEst) {
        const tempoMedio = temposPagina.reduce((a, b) => a + b, 0) / temposPagina.length
        const paginasRestantes = totalPaginasEst ? Math.max(0, totalPaginasEst - pagina) : null
        const tempoRestMin = paginasRestantes != null ? Math.ceil(paginasRestantes * (tempoMedio + 1000) / 60000) : null
        const pct = totalPaginasEst ? Math.min(98, Math.round((pagina / totalPaginasEst) * 100)) : null
        if (onProgress) onProgress({ pct, processadas: totalEJA, estimadas: ejaTotalEst, paginaAtual: pagina, totalPaginasEst, tempoRestMin })
        if (tempoRestMin != null) {
          onLog(`ℹ Progresso: ${totalEJA}/~${ejaTotalEst ?? '?'} conversas | Tempo restante: ~${tempoRestMin}min`)
        }
      }

      for (const conv of eja) {
        if (onCancel && onCancel()) {
          onLog('⛔ Sync interrompido pelo usuário.')
          totais.status = 'cancelado'
          break
        }
        try {
          const mapped = mapConversation(conv)
          const { acao } = await upsertConversa(mapped)
          if (acao === 'inserida') totais.conversas_importadas++
          if (acao === 'atualizada') totais.atualizadas++
          if (acao === 'sem_mudanca') totais.ignoradas++
          processadas++

          if (processadas % 50 === 0) {
            onLog(`ℹ ${processadas} conversas EJA processadas — aguardando 1s (rate limit)...`)
            await delay(1000)
          }
        } catch (err) {
          totais.erros++
          erroIds.push(String(conv.id))
          onLog(`⚠ Erro ao processar conversa ${conv.id}: ${err.message}`)
        }
      }
      if (totais.status === 'cancelado') break

      if (items.length < TAKE) {
        onLog('ℹ Última página atingida — paginação concluída.')
        break
      }

      skip += TAKE
      pagina++
      await delay(1000)
    }

    onLog(`✓ Sync concluído: ${totais.conversas_importadas} inseridas | ${totais.atualizadas} atualizadas | ${totais.ignoradas} sem mudança | ${totais.erros} erros`)
    onLog(`ℹ Total EJA encontradas: ${totalEJA} | Ignoradas (não-EJA): ${totalIgnoradas}`)

  } catch (err) {
    totais.status = 'erro'
    onLog(`✗ Erro fatal: ${err.message}`)
    totais.erros++
  } finally {
    if (logId) await finalizarLog(logId, totais)
  }

  return {
    ...totais,
    totalEJA,
    totalIgnoradas,
    paginasVarridas,
    totalPaginasEst,
    duracaoMs: Date.now() - tempoInicio,
    erroIds,
  }
}

export async function syncMensagensConversa(conversa, onLog = () => {}) {
  const { id: conversaId, datacrazy_id: datacrazyId } = conversa
  if (!datacrazyId) return { total: 0, erros: 0 }

  let importadas = 0
  let erros = 0

  try {
    const resultado = await fetchMessages(datacrazyId)
    const mensagens = Array.isArray(resultado) ? resultado
      : Array.isArray(resultado?.data) ? resultado.data
      : Array.isArray(resultado?.messages) ? resultado.messages
      : []

    for (const msg of mensagens) {
      if (msg.isInternal === true || msg.deleted === true) continue
      try {
        const isAudio = (a) => a.type === 'AUDIO' || a.mimeType?.startsWith('audio/')
        const isImage = (a) => a.type === 'IMAGE' || a.mimeType?.startsWith('image/')
        const atts = Array.isArray(msg.attachments) ? msg.attachments : []
        const audioAtt = atts.find(isAudio)
        const hasImage = atts.some(isImage)
        const tipo = audioAtt ? 'audio' : hasImage ? 'imagem' : 'texto'
        const de = msg.received ? 'lead' : 'consultora'
        const isAutoAudio = audioAtt && audioAtt.url?.includes('/flow-attachments/')
        const attendant_nome = !msg.received && msg.attendant?.name ? msg.attendant.name : null

        const { error } = await supabase
          .from('ci_mensagens')
          .upsert({
            conversa_id: conversaId,
            datacrazy_id: String(msg.id),
            tipo,
            de,
            conteudo: msg.body ?? '',
            enviado_at: msg.createdAt ?? null,
            audio_url: audioAtt?.url ?? null,
            is_auto: isAutoAudio ?? false,
            attendant_nome,
            created_at: new Date().toISOString(),
          }, { onConflict: 'datacrazy_id' })

        if (error) throw error
        importadas++
      } catch (err) {
        erros++
        onLog(`⚠ msg ${msg.id}: ${err.message}`)
      }
    }

    // Calcular e salvar métricas
    await organizarDadosConversa(conversaId, mensagens)
  } catch (err) {
    onLog(`✗ Erro ao buscar msgs de ${datacrazyId}: ${err.message}`)
    erros++
  }

  return { total: importadas, erros }
}

export async function organizarDadosConversa(conversaId, mensagens) {
  if (!mensagens || mensagens.length === 0) return

  const reais = mensagens.filter(m => !m.isInternal && !m.deleted)
  const totalMensagens = reais.length

  // Normalizar: suporta formato DataCrazy (received/createdAt) e Supabase (de/enviado_at)
  const normalizar = (m) => ({
    isLead: m.received === true || m.de === 'lead' || m.de === 'contato',
    isConsultora: m.received === false || m.de === 'consultora',
    ts: m.createdAt ?? m.enviado_at ?? null,
    hasAudio: Array.isArray(m.attachments) && m.attachments.some(a => a.type?.startsWith('audio/')),
  })

  const normalizadas = reais.map(normalizar)

  // Primeira mensagem automática: primeiro msg da consultora é áudio
  const primeiraMsgAutomatica = normalizadas.length > 0 &&
    normalizadas[0].isConsultora &&
    normalizadas[0].hasAudio

  // Tempo de resposta médio: para cada bloco de msgs do lead, busca próxima resposta da consultora
  const temposResposta = []
  for (let i = 0; i < normalizadas.length; i++) {
    const atual = normalizadas[i]
    if (!atual.isLead || !atual.ts) continue
    for (let j = i + 1; j < normalizadas.length; j++) {
      const prox = normalizadas[j]
      if (prox.isConsultora && prox.ts) {
        const diffMin = Math.round((new Date(prox.ts) - new Date(atual.ts)) / 60000)
        if (diffMin > 0 && diffMin < 1440) temposResposta.push(diffMin)
        break
      }
    }
  }
  const tempoRespostaMedio = temposResposta.length > 0
    ? Math.round(temposResposta.reduce((a, b) => a + b, 0) / temposResposta.length)
    : null

  // Tempo da primeira resposta: entre primeira msg do lead e primeira resposta da consultora
  const primeiraNormLead = normalizadas.find(m => m.isLead && m.ts)
  let tempoPrimeiraResposta = null
  if (primeiraNormLead) {
    const primeiraRespConsultora = normalizadas.find(
      m => m.isConsultora && m.ts && new Date(m.ts) > new Date(primeiraNormLead.ts)
    )
    if (primeiraRespConsultora) {
      const diffMin = Math.round(
        (new Date(primeiraRespConsultora.ts) - new Date(primeiraNormLead.ts)) / 60000
      )
      if (diffMin >= 0 && diffMin < 1440) tempoPrimeiraResposta = diffMin
    }
  }

  // Janela 24h: baseada na última mensagem DO LEAD (não da consultora)
  const ultimaNormLead = [...normalizadas].reverse().find(m => m.isLead && m.ts)
  const ultimaMensagemLeadAt = ultimaNormLead?.ts ?? null
  let janela24hStatus = 'sem_interacao'
  if (ultimaMensagemLeadAt) {
    const horasPassadas = (Date.now() - new Date(ultimaMensagemLeadAt).getTime()) / 3600000
    if (horasPassadas < 20) janela24hStatus = 'aberta'
    else if (horasPassadas < 24) janela24hStatus = 'critica'
    else janela24hStatus = 'expirada'
  }

  const updates = {
    total_mensagens: totalMensagens,
    primeira_msg_automatica: primeiraMsgAutomatica,
    janela_24h_status: janela24hStatus,
    ultima_mensagem_lead_at: ultimaMensagemLeadAt,
    updated_at: new Date().toISOString(),
  }
  if (tempoRespostaMedio !== null) updates.tempo_resposta_medio = tempoRespostaMedio
  if (tempoPrimeiraResposta !== null) updates.tempo_primeira_resposta = tempoPrimeiraResposta

  await supabase.from('ci_conversas').update(updates).eq('id', conversaId)
}

export async function syncMensagens(conversaId, datacrazyId, onLog = () => {}) {
  let importadas = 0
  let erros = 0

  try {
    onLog(`Buscando mensagens da conversa ${datacrazyId}...`)
    const resultado = await fetchMessages(datacrazyId)

    const mensagens = Array.isArray(resultado) ? resultado
      : Array.isArray(resultado?.data) ? resultado.data
      : Array.isArray(resultado?.messages) ? resultado.messages
      : []

    onLog(`${mensagens.length} mensagens encontradas.`)

    for (const msg of mensagens) {
      try {
        const { data: existente } = await supabase
          .from('ci_mensagens')
          .select('id')
          .eq('datacrazy_id', String(msg.id))
          .maybeSingle()

        if (existente) continue

        const isAudio = (a) => a.type === 'AUDIO' || a.mimeType?.startsWith('audio/')
        const isImage = (a) => a.type === 'IMAGE' || a.mimeType?.startsWith('image/')
        const atts = Array.isArray(msg.attachments) ? msg.attachments : []
        const audioAtt = atts.find(isAudio)
        const hasImage = atts.some(isImage)
        const tipo = audioAtt ? 'audio' : hasImage ? 'imagem' : 'texto'
        const de = msg.received ? 'lead' : 'consultora'
        const isAutoAudio = audioAtt && audioAtt.url?.includes('/flow-attachments/')
        const attendant_nome = !msg.received && msg.attendant?.name ? msg.attendant.name : null

        const { error } = await supabase
          .from('ci_mensagens')
          .insert({
            conversa_id: conversaId,
            datacrazy_id: String(msg.id),
            tipo,
            de,
            conteudo: msg.body ?? '',
            enviado_at: msg.createdAt ?? null,
            audio_url: audioAtt?.url ?? null,
            is_auto: isAutoAudio ?? false,
            attendant_nome,
            created_at: new Date().toISOString(),
          })

        if (error) throw error
        importadas++
      } catch (err) {
        erros++
        onLog(`⚠ Erro na mensagem ${msg.id}: ${err.message}`)
      }
    }

    onLog(`✓ Mensagens: ${importadas} importadas | ${erros} erros`)
  } catch (err) {
    onLog(`✗ Erro ao buscar mensagens: ${err.message}`)
  }

  return { importadas, erros }
}
