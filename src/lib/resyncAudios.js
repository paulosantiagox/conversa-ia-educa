import { supabase } from './supabase'
import { fetchMessages, delay } from './datacrazy'

export async function resyncAudios(onLog = () => {}, onCancel = null, onProgress = null) {
  onLog('ℹ Iniciando re-sync de áudios...')

  // Buscar conversas recentes com mensagens (últimos 60 dias)
  const limite = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  const { data: conversas, error } = await supabase
    .from('ci_conversas')
    .select('id, datacrazy_id, contato_nome, total_mensagens')
    .not('datacrazy_id', 'is', null)
    .gt('total_mensagens', 0)
    .gte('ultima_mensagem_at', limite)
    .order('ultima_mensagem_at', { ascending: false })

  if (error) {
    onLog(`✗ Erro ao buscar conversas: ${error.message}`)
    return { atualizadas: 0, audiosEncontrados: 0, erros: 0 }
  }

  const total = conversas?.length ?? 0
  onLog(`ℹ ${total} conversas para verificar (últimos 60 dias)`)

  let atualizadas = 0
  let audiosEncontrados = 0
  let erros = 0

  const isAudio = (a) => a.type === 'AUDIO' || a.mimeType?.startsWith('audio/')
  const isImage = (a) => a.type === 'IMAGE' || a.mimeType?.startsWith('image/')

  for (let i = 0; i < conversas.length; i++) {
    if (onCancel?.()) {
      onLog('⛔ Re-sync interrompido pelo usuário.')
      break
    }

    const conv = conversas[i]
    const nome = conv.contato_nome || conv.id

    try {
      const resultado = await fetchMessages(conv.datacrazy_id)
      const mensagens = Array.isArray(resultado) ? resultado
        : Array.isArray(resultado?.data) ? resultado.data
        : Array.isArray(resultado?.messages) ? resultado.messages
        : []

      let audiosNestaConversa = 0

      for (const msg of mensagens) {
        if (msg.isInternal || msg.deleted) continue
        const atts = Array.isArray(msg.attachments) ? msg.attachments : []
        const audioAtt = atts.find(isAudio)
        const hasImage = atts.some(isImage)

        if (!audioAtt && !hasImage) continue

        const tipo = audioAtt ? 'audio' : 'imagem'
        const isAutoAudio = audioAtt?.url?.includes('/flow-attachments/') ?? false

        const { error: upErr } = await supabase
          .from('ci_mensagens')
          .update({
            tipo,
            audio_url: audioAtt?.url ?? null,
            is_auto: isAutoAudio,
          })
          .eq('datacrazy_id', String(msg.id))

        if (!upErr) {
          audiosNestaConversa++
          audiosEncontrados++
        }
      }

      if (audiosNestaConversa > 0) {
        atualizadas++
        onLog(`✓ ${nome} → ${audiosNestaConversa} áudio(s) corrigido(s)`)
      }
    } catch (err) {
      erros++
      onLog(`⚠ Erro em ${nome}: ${err.message}`)
    }

    const pct = Math.round(((i + 1) / total) * 100)
    onProgress?.({ atual: i + 1, total, atualizadas, audiosEncontrados, erros, pct })

    await delay(1200)
  }

  onLog(`✓ Re-sync concluído: ${atualizadas} conversas com áudio | ${audiosEncontrados} mensagens corrigidas | ${erros} erros`)
  return { atualizadas, audiosEncontrados, erros }
}
