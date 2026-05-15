const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

export async function transcreverAudio(audioUrl, datacrazy_id) {
  const audioRes = await fetch(audioUrl)
  if (!audioRes.ok) throw new Error(`Erro ao baixar áudio: ${audioRes.status}`)
  const audioBlob = await audioRes.blob()

  const form = new FormData()
  form.append('file', audioBlob, `${datacrazy_id}.ogg`)
  form.append('model', 'whisper-1')
  form.append('language', 'pt')

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
  return data.text ?? ''
}
