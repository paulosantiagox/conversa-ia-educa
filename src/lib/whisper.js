const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

// Baixa o áudio com retry — o CDN g1cdn1.datacrazy.io dá falhas transitórias
// sob carga. Só 404/403 são definitivos (arquivo não existe); rede/5xx são retentados.
async function baixarAudioComRetry(audioUrl, tentativas = 3) {
  let ultimoErro
  for (let t = 1; t <= tentativas; t++) {
    try {
      const res = await fetch(audioUrl)
      if (res.ok) return await res.blob()
      const e = new Error(`Erro ao baixar áudio: ${res.status}`)
      e.httpStatus = res.status
      if (res.status === 404 || res.status === 403) throw e  // definitivo — não adianta retry
      ultimoErro = e
    } catch (err) {
      if (err.httpStatus === 404 || err.httpStatus === 403) throw err
      ultimoErro = err  // rede/CORS/timeout — tenta de novo
    }
    if (t < tentativas) await new Promise(r => setTimeout(r, 700 * t))
  }
  throw ultimoErro
}

export async function transcreverAudio(audioUrl, datacrazy_id) {
  const audioBlob = await baixarAudioComRetry(audioUrl)

  const form = new FormData()
  form.append('file', audioBlob, `${datacrazy_id}.ogg`)
  form.append('model', 'whisper-1')
  form.append('language', 'pt')
  form.append('response_format', 'verbose_json')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Whisper error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return { text: data.text ?? '', duracao_segundos: data.duration ?? 0 }
}
