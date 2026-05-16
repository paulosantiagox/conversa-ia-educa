import { supabase } from './supabase'
import { transcreverAudio } from './whisper'

const delay = (ms) => new Promise(r => setTimeout(r, ms))

export async function contarAudiosPendentes() {
  const { count } = await supabase
    .from('ci_mensagens')
    .select('*', { count: 'exact', head: true })
    .eq('tipo', 'audio')
    .is('transcricao', null)
    .not('audio_url', 'is', null)
    .eq('is_auto', false)
  return count ?? 0
}

export async function rodarWhisper(modo = 'teste', onLog = () => {}, onCancel = null, onProgress = null) {
  const limites = { teste: 5, recentes: 200, completo: 99999 }
  const limite = limites[modo] ?? 5

  onLog(`ℹ Modo: ${modo.toUpperCase()} — buscando áudios pendentes...`)

  const { data: audios, error } = await supabase
    .from('ci_mensagens')
    .select('id, audio_url, datacrazy_id, conversa_id')
    .eq('tipo', 'audio')
    .is('transcricao', null)
    .not('audio_url', 'is', null)
    .eq('is_auto', false)
    .limit(limite)

  if (error) { onLog(`✗ ${error.message}`); return { concluidas: 0, erros: 0 } }

  const total = audios?.length ?? 0
  onLog(`ℹ ${total} áudios para transcrever`)

  let concluidas = 0
  let erros = 0

  for (let i = 0; i < audios.length; i++) {
    if (onCancel?.()) { onLog('⛔ Interrompido.'); break }

    const audio = audios[i]
    try {
      const { data: cache } = await supabase
        .from('ci_mensagens')
        .select('transcricao')
        .eq('audio_url', audio.audio_url)
        .not('transcricao', 'is', null)
        .limit(1)
        .maybeSingle()

      if (cache?.transcricao) {
        await supabase
          .from('ci_mensagens')
          .update({ transcricao: cache.transcricao })
          .eq('id', audio.id)
        concluidas++
        onLog(`✓ [${i + 1}/${total}] [cache] ${cache.transcricao.substring(0, 60)}...`)
        onProgress?.({ atual: i + 1, total, concluidas, erros, pct: Math.round(((i + 1) / total) * 100) })
        continue
      }

      onLog(`ℹ [${i + 1}/${total}] Transcrevendo...`)
      const { text: transcricao, duracao_segundos } = await transcreverAudio(audio.audio_url, audio.datacrazy_id)

      await supabase
        .from('ci_mensagens')
        .update({ transcricao })
        .eq('id', audio.id)

      await supabase.from('ci_uso_api').insert({
        servico: 'openai',
        operacao: 'transcricao_audio',
        modelo: 'whisper-1',
        custo_usd: (duracao_segundos / 60) * 0.006,
        duracao_segundos: duracao_segundos ?? 0,
        conversa_id: audio.conversa_id ?? null,
      })

      concluidas++
      onLog(`✓ [${i + 1}/${total}] ${transcricao.substring(0, 60)}...`)
    } catch (err) {
      const isFetchError = /fetch|network|Failed|NetworkError/i.test(err.message) || err.status === 403 || err.status === 404
      if (isFetchError) {
        await supabase
          .from('ci_mensagens')
          .update({ transcricao: '[inacessível]' })
          .eq('id', audio.id)
        onLog(`⚠ [${i + 1}/${total}] URL inacessível — marcada para pular`)
      } else {
        erros++
        onLog(`⚠ [${i + 1}/${total}] Erro: ${err.message}`)
      }
    }

    onProgress?.({ atual: i + 1, total, concluidas, erros, pct: Math.round(((i + 1) / total) * 100) })
    await delay(300)
  }

  onLog(`✓ Concluído: ${concluidas} transcritos | ${erros} erros`)
  return { concluidas, erros }
}
