import { supabase } from './supabase'

// Transcreve via Edge Function (server-side). A OpenAI bloqueia a chamada direta
// do navegador (CORS no /audio/transcriptions), então o download + Whisper rodam
// no servidor. A função devolve { ok, text, duracao_segundos } ou { ok:false, tipo }.
export async function transcreverAudio(audioUrl, datacrazy_id) {
  const { data, error } = await supabase.functions.invoke('transcrever-audio', {
    body: { audio_url: audioUrl, datacrazy_id },
  })

  // Erro de rede/HTTP ao chamar a própria função (não a OpenAI)
  if (error) {
    throw new Error('Função de transcrição indisponível: ' + (error.message ?? String(error)))
  }

  if (!data?.ok) {
    if (data?.tipo === 'inacessivel') {
      const e = new Error(`Áudio inacessível (${data.httpStatus ?? 404})`)
      e.httpStatus = data.httpStatus ?? 404   // rodarWhisper marca '[inacessível]' só nesse caso
      throw e
    }
    if (data?.tipo === 'quota') {
      throw new Error('429 quota OpenAI esgotada')  // rodarWhisper detecta e pausa (semCredito)
    }
    throw new Error(data?.mensagem ?? 'erro na transcrição')  // transitório — fica pendente
  }

  return { text: data.text ?? '', duracao_segundos: data.duracao_segundos ?? 0 }
}
