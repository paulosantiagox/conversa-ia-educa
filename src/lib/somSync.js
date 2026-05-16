function tocar(notas) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    notas.forEach(({ freq, inicio, duracao }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.7, ctx.currentTime + inicio)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracao)
      osc.start(ctx.currentTime + inicio)
      osc.stop(ctx.currentTime + inicio + duracao)
    })
    setTimeout(() => ctx.close(), 1000)
  } catch {}
}

// Conversa importada: nota suave G5
export function somConversaImportada() {
  tocar([{ freq: 784, inicio: 0, duracao: 0.10 }])
}

// Mensagens sincronizadas: dois tons ascendentes C5 → E5
export function somMensagensSincronizadas() {
  tocar([
    { freq: 523, inicio: 0,    duracao: 0.08 },
    { freq: 659, inicio: 0.07, duracao: 0.10 },
  ])
}

// Áudio transcrito: ping cristalino A5
export function somAudioTranscrito() {
  tocar([{ freq: 880, inicio: 0, duracao: 0.12 }])
}

// Análise IA: acorde suave C5-E5-G5
export function somAnaliseIA() {
  tocar([
    { freq: 523, inicio: 0,    duracao: 0.15 },
    { freq: 659, inicio: 0.04, duracao: 0.15 },
    { freq: 784, inicio: 0.08, duracao: 0.15 },
  ])
}
