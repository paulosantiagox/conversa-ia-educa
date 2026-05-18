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

const LOTE = 1000

async function buscarLote(limite) {
  const { data, error } = await supabase
    .from('ci_mensagens')
    .select('id, audio_url, datacrazy_id, conversa_id')
    .eq('tipo', 'audio')
    .is('transcricao', null)
    .not('audio_url', 'is', null)
    .eq('is_auto', false)
    .limit(limite)
  return { data: data ?? [], error }
}

async function processarAudio(audio, idx, total, concluidas, erros, onLog, onProgress) {
  const { data: cache } = await supabase
    .from('ci_mensagens')
    .select('transcricao')
    .eq('audio_url', audio.audio_url)
    .not('transcricao', 'is', null)
    .limit(1)
    .maybeSingle()

  if (cache?.transcricao) {
    await supabase.from('ci_mensagens').update({ transcricao: cache.transcricao }).eq('id', audio.id)
    concluidas++
    onLog(`✓ [${idx}/${total}] [cache] ${cache.transcricao.substring(0, 60)}...`)
    onProgress?.({ atual: idx, total, concluidas, erros, pct: Math.round((idx / total) * 100) })
    return { concluidas, erros, cache: true }
  }

  onLog(`ℹ [${idx}/${total}] Transcrevendo...`)
  const { text: transcricao, duracao_segundos } = await transcreverAudio(audio.audio_url, audio.datacrazy_id)

  await supabase.from('ci_mensagens').update({ transcricao }).eq('id', audio.id)
  await supabase.from('ci_uso_api').insert({
    servico: 'openai',
    operacao: 'transcricao_audio',
    modelo: 'whisper-1',
    custo_usd: (duracao_segundos / 60) * 0.006,
    duracao_segundos: duracao_segundos ?? 0,
    conversa_id: audio.conversa_id ?? null,
  })

  concluidas++
  onLog(`✓ [${idx}/${total}] ${transcricao.substring(0, 60)}...`)
  onProgress?.({ atual: idx, total, concluidas, erros, pct: Math.round((idx / total) * 100) })
  return { concluidas, erros, cache: false }
}

export async function rodarWhisper(modo = 'teste', onLog = () => {}, onCancel = null, onProgress = null) {
  const limiteFixo = { teste: 5, recentes: 200 }
  const isCompleto = modo === 'completo'

  onLog(`ℹ Modo: ${modo.toUpperCase()} — buscando áudios pendentes...`)

  // Para teste/recentes: busca única com limite fixo
  if (!isCompleto) {
    const limite = limiteFixo[modo] ?? 5
    const { data: audios, error } = await buscarLote(limite)
    if (error) { onLog(`✗ ${error.message}`); return { concluidas: 0, erros: 0 } }

    const total = audios.length
    onLog(`ℹ ${total} áudios para transcrever`)

    let concluidas = 0
    let erros = 0

    for (let i = 0; i < audios.length; i++) {
      if (onCancel?.()) { onLog('⛔ Interrompido.'); break }
      try {
        const res = await processarAudio(audios[i], i + 1, total, concluidas, erros, onLog, onProgress)
        concluidas = res.concluidas
        erros = res.erros
      } catch (err) {
        const isFetchError = /fetch|network|Failed|NetworkError/i.test(err.message) || err.status === 403 || err.status === 404
        if (isFetchError) {
          await supabase.from('ci_mensagens').update({ transcricao: '[inacessível]' }).eq('id', audios[i].id)
          onLog(`⚠ [${i + 1}/${total}] URL inacessível — marcada para pular`)
        } else {
          erros++
          onLog(`⚠ [${i + 1}/${total}] Erro: ${err.message}`)
        }
        onProgress?.({ atual: i + 1, total, concluidas, erros, pct: Math.round(((i + 1) / total) * 100) })
      }
      await delay(300)
    }

    onLog(`✓ Concluído: ${concluidas} transcritos | ${erros} erros`)
    return { concluidas, erros }
  }

  // COMPLETO: paginação — busca lotes de 1000 até zerar os pendentes
  let totalEstimado = await contarAudiosPendentes()
  if (!totalEstimado) {
    // fallback: busca primeiro lote para estimar
    const { data: primeiro } = await buscarLote(LOTE)
    totalEstimado = primeiro?.length === LOTE ? 99999 : (primeiro?.length ?? 0)
  }
  onLog(`ℹ ~${totalEstimado} áudios pendentes`)

  let concluidas = 0
  let erros = 0
  let processados = 0
  let total = totalEstimado

  while (true) {
    if (onCancel?.()) { onLog('⛔ Interrompido.'); break }

    const { data: lote, error } = await buscarLote(LOTE)
    if (error) { onLog(`✗ ${error.message}`); break }
    if (!lote.length) { onLog('ℹ Nenhum pendente restante.'); break }

    onLog(`ℹ Lote: ${lote.length} áudios (${processados} processados até agora)`)

    for (let i = 0; i < lote.length; i++) {
      if (onCancel?.()) { onLog('⛔ Interrompido.'); break }
      processados++
      try {
        const res = await processarAudio(lote[i], processados, total, concluidas, erros, onLog, onProgress)
        concluidas = res.concluidas
        erros = res.erros
      } catch (err) {
        const isFetchError = /fetch|network|Failed|NetworkError/i.test(err.message) || err.status === 403 || err.status === 404
        if (isFetchError) {
          await supabase.from('ci_mensagens').update({ transcricao: '[inacessível]' }).eq('id', lote[i].id)
          onLog(`⚠ [${processados}/${total}] URL inacessível — marcada para pular`)
        } else {
          erros++
          onLog(`⚠ [${processados}/${total}] Erro: ${err.message}`)
        }
        onProgress?.({ atual: processados, total, concluidas, erros, pct: Math.round((processados / total) * 100) })
      }
      await delay(300)
    }

    if (onCancel?.()) break

    // Se o lote retornou menos que 1000, acabou
    if (lote.length < LOTE) break
  }

  onLog(`✓ Concluído: ${concluidas} transcritos | ${erros} erros`)
  return { concluidas, erros }
}
