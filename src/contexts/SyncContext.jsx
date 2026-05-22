import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { syncConversas } from '../lib/syncDataCrazy'
import { syncMensagensModo } from '../lib/syncMensagens'
import { rodarAnaliseModo } from '../lib/rodarAnalise'
import { rodarWhisper, contarAudiosPendentes } from '../lib/rodarWhisper'
import { iniciarAutoSync } from '../lib/autoSync'
import {
  somConversaImportada,
  somMensagensSincronizadas,
  somAudioTranscrito,
  somAnaliseIA,
} from '../lib/somSync'

const SyncContext = createContext(null)

export function useSync() {
  return useContext(SyncContext)
}

const SONS = {
  conversas: somConversaImportada,
  mensagens: somMensagensSincronizadas,
  whisper:   somAudioTranscrito,
  analise:   somAnaliseIA,
}

function pushLog(setter, msg, tipo) {
  setter(prev => {
    const entry = { ts: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), msg }
    const next = [...prev, entry]
    return next.length > 500 ? next.slice(-500) : next
  })
  if (msg.startsWith('✓') && tipo && SONS[tipo]) SONS[tipo]()
}

export function SyncProvider({ children }) {
  // ─── Sync Conversas ───
  const [syncConversasAtivo, setSyncConversasAtivo] = useState(false)
  const [syncConversasProgresso, setSyncConversasProgresso] = useState({ pct: null, processadas: 0, estimadas: null })
  const [syncConversasLogs, setSyncConversasLogs] = useState([])
  const [syncConversasResumo, setSyncConversasResumo] = useState(null)
  const cancelConversasRef = useRef(false)

  // ─── Sync Mensagens ───
  const [syncMensagensAtivo, setSyncMensagensAtivo] = useState(false)
  const [syncMensagensProgresso, setSyncMensagensProgresso] = useState({ pct: null, atual: 0, total: 0 })
  const [syncMensagensLogs, setSyncMensagensLogs] = useState([])
  const [syncMensagensResumo, setSyncMensagensResumo] = useState(null)
  const cancelMensagensRef = useRef(false)

  // ─── Análise IA ───
  const [analiseAtiva, setAnaliseAtiva] = useState(false)
  const [analiseProgresso, setAnaliseProgresso] = useState({ pct: null, atual: 0, total: 0 })
  const [analiseLogs, setAnaliseLogs] = useState([])
  const [analiseResultados, setAnaliseResultados] = useState([])
  const [analiseDist, setAnaliseDist] = useState({ quente: 0, morno: 0, frio: 0, vendido: 0, perdido: 0 })
  const cancelAnaliseRef = useRef(false)

  // ─── Whisper ───
  const [whisperAtivo, setWhisperAtivo] = useState(false)
  const [whisperLogs, setWhisperLogs] = useState([])
  const [whisperProgresso, setWhisperProgresso] = useState(null)
  const [whisperResultado, setWhisperResultado] = useState(null)
  const [whisperSemCredito, setWhisperSemCredito] = useState(false)
  const [whisperPendentes, setWhisperPendentes] = useState(0)
  const [modoWhisper, setModoWhisper] = useState('teste')
  const cancelWhisperRef = useRef(false)

  // ─── Auto-sync ───
  const [autoSyncAtivo, setAutoSyncAtivo] = useState(() => localStorage.getItem('conversia_autosync') === 'true')
  const [ultimoAutoSync, setUltimoAutoSync] = useState(null)
  const [proximoAutoSync, setProximoAutoSync] = useState(null)
  const [autoSyncLogs, setAutoSyncLogs] = useState([])
  const pararAutoSyncRef = useRef(null)
  const qualquerAtivoRef = useRef(false)

  useEffect(() => { contarAudiosPendentes().then(setWhisperPendentes) }, [])

  const qualquerAtivo = syncConversasAtivo || syncMensagensAtivo || analiseAtiva || whisperAtivo

  // Manter ref sincronizada para uso no autoSync (closure)
  useEffect(() => { qualquerAtivoRef.current = qualquerAtivo }, [qualquerAtivo])

  // Iniciar autoSync automaticamente se estava ativo
  useEffect(() => {
    if (autoSyncAtivo) {
      pararAutoSyncRef.current = iniciarAutoSync({
        onLog: (msg) => pushLog(setAutoSyncLogs, msg, null),
        onUltimoSync: setUltimoAutoSync,
        onProximoSync: setProximoAutoSync,
        isQualquerAtivo: () => qualquerAtivoRef.current,
      })
    }
    return () => { pararAutoSyncRef.current?.() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function ativarAutoSync() {
    localStorage.setItem('conversia_autosync', 'true')
    setAutoSyncAtivo(true)
    setAutoSyncLogs([])
    setProximoAutoSync(new Date(Date.now() + 10 * 60 * 1000))
    pararAutoSyncRef.current = iniciarAutoSync({
      onLog: (msg) => pushLog(setAutoSyncLogs, msg, null),
      onUltimoSync: setUltimoAutoSync,
      onProximoSync: setProximoAutoSync,
      isQualquerAtivo: () => qualquerAtivoRef.current,
    })
  }

  function desativarAutoSync() {
    localStorage.setItem('conversia_autosync', 'false')
    setAutoSyncAtivo(false)
    setProximoAutoSync(null)
    pararAutoSyncRef.current?.()
    pararAutoSyncRef.current = null
  }

  async function iniciarSyncConversas() {
    if (syncConversasAtivo) return null
    cancelConversasRef.current = false
    setSyncConversasAtivo(true)
    setSyncConversasResumo(null)
    setSyncConversasProgresso({ pct: null, processadas: 0, estimadas: null })
    setSyncConversasLogs([])
    try {
      const resultado = await syncConversas(
        (msg) => pushLog(setSyncConversasLogs, msg, 'conversas'),
        () => cancelConversasRef.current,
        ({ pct, processadas, estimadas }) =>
          setSyncConversasProgresso({ pct, processadas, estimadas })
      )
      setSyncConversasProgresso(prev => ({
        ...prev,
        pct: resultado.status === 'erro' ? prev.pct : 100,
      }))
      setSyncConversasResumo(resultado)
      return resultado
    } finally {
      setSyncConversasAtivo(false)
    }
  }

  function pararSyncConversas() { cancelConversasRef.current = true }

  async function iniciarSyncMensagens(modo) {
    if (syncMensagensAtivo) return null
    cancelMensagensRef.current = false
    setSyncMensagensAtivo(true)
    setSyncMensagensResumo(null)
    setSyncMensagensProgresso({ pct: null, atual: 0, total: 0 })
    setSyncMensagensLogs([])
    try {
      const resultado = await syncMensagensModo(
        modo,
        (msg) => pushLog(setSyncMensagensLogs, msg, 'mensagens'),
        () => cancelMensagensRef.current,
        ({ atual, total, pct }) => setSyncMensagensProgresso({ pct, atual, total })
      )
      setSyncMensagensProgresso(prev => ({ ...prev, pct: 100 }))
      setSyncMensagensResumo(resultado)
      return resultado
    } finally {
      setSyncMensagensAtivo(false)
    }
  }

  function pararSyncMensagens() { cancelMensagensRef.current = true }

  async function iniciarAnalise(modo) {
    if (analiseAtiva) return null
    cancelAnaliseRef.current = false
    setAnaliseAtiva(true)
    setAnaliseResultados([])
    setAnaliseDist({ quente: 0, morno: 0, frio: 0, vendido: 0, perdido: 0 })
    setAnaliseProgresso({ pct: null, atual: 0, total: 0 })
    setAnaliseLogs([])
    try {
      const resultado = await rodarAnaliseModo(
        modo,
        (msg) => pushLog(setAnaliseLogs, msg, 'analise'),
        () => cancelAnaliseRef.current,
        ({ atual, total, pct, ultimoResultado }) => {
          setAnaliseProgresso({ pct, atual, total })
          if (ultimoResultado) {
            setAnaliseResultados(prev => [ultimoResultado, ...prev])
            setAnaliseDist(prev => {
              const cl = (ultimoResultado.classificacao_ia ?? '').toLowerCase()
              return { ...prev, [cl]: (prev[cl] ?? 0) + 1 }
            })
          }
        }
      )
      setAnaliseProgresso(prev => ({ ...prev, pct: 100 }))
      return resultado
    } finally {
      setAnaliseAtiva(false)
    }
  }

  function pararAnalise() { cancelAnaliseRef.current = true }

  async function iniciarWhisper(modo) {
    if (whisperAtivo) return null
    cancelWhisperRef.current = false
    setWhisperAtivo(true)
    setWhisperLogs([])
    setWhisperProgresso(null)
    setWhisperResultado(null)
    setWhisperSemCredito(false)
    try {
      const resultado = await rodarWhisper(
        modo,
        (msg) => pushLog(setWhisperLogs, msg, 'whisper'),
        () => cancelWhisperRef.current,
        ({ atual, total, pct, concluidas, erros }) =>
          setWhisperProgresso({ atual, total, pct, concluidas, erros })
      )
      setWhisperResultado(resultado)
      if (resultado?.semCredito) setWhisperSemCredito(true)
      const pendentes = await contarAudiosPendentes()
      setWhisperPendentes(pendentes)
      return resultado
    } finally {
      setWhisperAtivo(false)
    }
  }

  function pararWhisper() { cancelWhisperRef.current = true }

  function pararTudo() {
    cancelConversasRef.current = true
    cancelMensagensRef.current = true
    cancelAnaliseRef.current = true
    cancelWhisperRef.current = true
  }

  return (
    <SyncContext.Provider value={{
      syncConversasAtivo, syncConversasProgresso, syncConversasLogs, syncConversasResumo,
      iniciarSyncConversas, pararSyncConversas,
      syncMensagensAtivo, syncMensagensProgresso, syncMensagensLogs, syncMensagensResumo,
      iniciarSyncMensagens, pararSyncMensagens,
      analiseAtiva, analiseProgresso, analiseLogs, analiseResultados, analiseDist,
      iniciarAnalise, pararAnalise,
      whisperAtivo, whisperLogs, whisperProgresso, whisperResultado, whisperPendentes,
      whisperSemCredito, setWhisperSemCredito,
      modoWhisper, setModoWhisper, iniciarWhisper, pararWhisper,
      autoSyncAtivo, ultimoAutoSync, proximoAutoSync, autoSyncLogs,
      ativarAutoSync, desativarAutoSync,
      qualquerAtivo, pararTudo,
    }}>
      {children}
    </SyncContext.Provider>
  )
}
