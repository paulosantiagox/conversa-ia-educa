import { createContext, useContext, useRef, useState } from 'react'
import { syncConversas } from '../lib/syncDataCrazy'
import { syncMensagensModo } from '../lib/syncMensagens'
import { rodarAnaliseModo } from '../lib/rodarAnalise'

const SyncContext = createContext(null)

export function useSync() {
  return useContext(SyncContext)
}

function pushLog(setter, msg) {
  setter(prev => {
    const entry = { ts: new Date().toLocaleTimeString('pt-BR'), msg }
    const next = [...prev, entry]
    return next.length > 500 ? next.slice(-500) : next
  })
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

  const qualquerAtivo = syncConversasAtivo || syncMensagensAtivo || analiseAtiva

  async function iniciarSyncConversas() {
    if (syncConversasAtivo) return null
    cancelConversasRef.current = false
    setSyncConversasAtivo(true)
    setSyncConversasResumo(null)
    setSyncConversasProgresso({ pct: null, processadas: 0, estimadas: null })
    setSyncConversasLogs([])
    try {
      const resultado = await syncConversas(
        (msg) => pushLog(setSyncConversasLogs, msg),
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
        (msg) => pushLog(setSyncMensagensLogs, msg),
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
        (msg) => pushLog(setAnaliseLogs, msg),
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

  function pararTudo() {
    cancelConversasRef.current = true
    cancelMensagensRef.current = true
    cancelAnaliseRef.current = true
  }

  return (
    <SyncContext.Provider value={{
      syncConversasAtivo, syncConversasProgresso, syncConversasLogs, syncConversasResumo,
      iniciarSyncConversas, pararSyncConversas,
      syncMensagensAtivo, syncMensagensProgresso, syncMensagensLogs, syncMensagensResumo,
      iniciarSyncMensagens, pararSyncMensagens,
      analiseAtiva, analiseProgresso, analiseLogs, analiseResultados, analiseDist,
      iniciarAnalise, pararAnalise,
      qualquerAtivo, pararTudo,
    }}>
      {children}
    </SyncContext.Provider>
  )
}
