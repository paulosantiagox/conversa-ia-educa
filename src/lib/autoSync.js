import { syncConversas } from './syncDataCrazy'
import { syncMensagensModo } from './syncMensagens'
import { rodarWhisper } from './rodarWhisper'

const INTERVALO_MS = 10 * 60 * 1000 // 10 minutos

export function iniciarAutoSync({ onLog, onUltimoSync, onProximoSync, isQualquerAtivo }) {
  let rodando = false
  let timeoutId = null
  let parado = false

  async function ciclo() {
    if (parado) return

    const agora = new Date()
    onLog?.(`ℹ [Auto-sync] Iniciando ciclo — ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`)

    if (isQualquerAtivo?.()) {
      onLog?.(`⚠ [Auto-sync] Operação manual em andamento — aguardando próximo ciclo`)
      agendarProximo()
      return
    }

    if (rodando) return
    rodando = true

    try {
      // 1. Conversas
      onLog?.(`ℹ [Auto-sync] Sincronizando conversas...`)
      await syncConversas(
        (msg) => onLog?.(`  ${msg}`),
        () => parado,
        () => {}
      )
      if (parado) return

      await new Promise(r => setTimeout(r, 3000))
      if (parado) return

      // 2. Mensagens das últimas 24h (incremental — conversas novas e com msgs novas)
      onLog?.(`ℹ [Auto-sync] Sincronizando mensagens das últimas 24h...`)
      await syncMensagensModo(
        'ultimas_24h',
        (msg) => onLog?.(`  ${msg}`),
        () => parado,
        () => {}
      )
      if (parado) return

      await new Promise(r => setTimeout(r, 3000))
      if (parado) return

      // 3. Whisper — transcrever áudios novos
      onLog?.(`ℹ [Auto-sync] Transcrevendo áudios pendentes...`)
      const whisperRes = await rodarWhisper(
        'recentes',
        (msg) => onLog?.(`  ${msg}`),
        () => parado,
        () => {}
      )
      if (whisperRes?.semCredito) {
        onLog?.(`⚠ [Auto-sync] Cota OpenAI esgotada — transcrição pausada até recarregar créditos`)
      }

      const fim = new Date()
      onLog?.(`✓ [Auto-sync] Ciclo concluído — ${fim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`)
      onUltimoSync?.(fim)
    } catch (err) {
      onLog?.(`✗ [Auto-sync] Erro no ciclo: ${err.message}`)
    } finally {
      rodando = false
    }

    agendarProximo()
  }

  function agendarProximo() {
    if (parado) return
    const proximo = new Date(Date.now() + INTERVALO_MS)
    onProximoSync?.(proximo)
    timeoutId = setTimeout(ciclo, INTERVALO_MS)
  }

  ciclo()

  return function pararAutoSync() {
    parado = true
    if (timeoutId) clearTimeout(timeoutId)
    onProximoSync?.(null)
    onLog?.(`ℹ [Auto-sync] Desativado`)
  }
}
