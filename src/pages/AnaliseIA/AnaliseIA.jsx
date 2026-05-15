import { useState, useEffect, useRef, useCallback } from 'react'
import { Brain, RefreshCw, StopCircle, CheckCircle, Clock, Flame, TrendingUp, ShoppingBag, Snowflake } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { ScoreBar } from '../../components/shared/ScoreBar'
import { useToast } from '../../contexts/ToastContext'
import { rodarAnaliseIA, contarPendentes, contarAnalisadas } from '../../lib/rodarAnalise'
import { getScoreColor } from '../../lib/utils'

function LogLine({ msg }) {
  const cor =
    msg.startsWith('✓') ? 'text-green-400' :
    msg.startsWith('✗') ? 'text-red-400' :
    msg.startsWith('⚠') ? 'text-amber-400' :
    msg.startsWith('⛔') ? 'text-slate-400' :
    msg.startsWith('ℹ') ? 'text-blue-400' :
    'text-slate-300'
  return <span className={cor}>{msg}</span>
}

function ClassBadge({ cls }) {
  const map = {
    quente:  'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-700',
    morno:   'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700',
    frio:    'bg-slate-50 dark:bg-slate-700 text-slate-500 border-slate-200 dark:border-slate-600',
    vendido: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-700',
    perdido: 'bg-slate-100 dark:bg-slate-700 text-slate-400 border-slate-200 dark:border-slate-600',
  }
  const cls2 = map[cls] ?? map.frio
  return <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase ${cls2}`}>{cls ?? '—'}</span>
}

export function AnaliseIA() {
  const [pendentes, setPendentes] = useState(null)
  const [analisadas, setAnalisadas] = useState(null)
  const [rodando, setRodando] = useState(false)
  const [logs, setLogs] = useState([])
  const [progresso, setProgresso] = useState({ atual: 0, total: 0, pct: 0, erros: 0 })
  const [resultados, setResultados] = useState([])
  const [dist, setDist] = useState({ quente: 0, morno: 0, frio: 0, vendido: 0 })
  const logsEndRef = useRef(null)
  const cancelRef = useRef(false)
  const toast = useToast()

  useEffect(() => { carregarContadores() }, [])
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [logs])

  async function carregarContadores() {
    const [p, a] = await Promise.all([contarPendentes(), contarAnalisadas()])
    setPendentes(p)
    setAnalisadas(a)
  }

  function addLog(msg) {
    setLogs(prev => [...prev, { ts: new Date().toLocaleTimeString('pt-BR'), msg }])
  }

  function handleProgress({ atual, total, concluidas, erros, pct, ultimoResultado }) {
    setProgresso({ atual: atual ?? 0, total: total ?? 0, pct: pct ?? 0, erros: erros ?? 0 })
    if (ultimoResultado) {
      setResultados(prev => {
        const novo = [ultimoResultado, ...prev].slice(0, 20)
        // atualizar distribuição
        const d = { quente: 0, morno: 0, frio: 0, vendido: 0 }
        novo.forEach(r => { if (d[r.classificacao_ia] !== undefined) d[r.classificacao_ia]++ })
        setDist(d)
        return novo
      })
    }
  }

  async function iniciarAnalise() {
    if (rodando) return
    cancelRef.current = false
    setRodando(true)
    setLogs([])
    setResultados([])
    setDist({ quente: 0, morno: 0, frio: 0, vendido: 0 })
    setProgresso({ atual: 0, total: 0, pct: 0, erros: 0 })
    try {
      const resultado = await rodarAnaliseIA(addLog, () => cancelRef.current, handleProgress)
      if (resultado.concluidas === 0 && resultado.erros === 0) {
        toast.info('Nenhuma conversa pendente para analisar')
      } else if (cancelRef.current) {
        toast.info('Análise cancelada')
      } else {
        toast.success(`Análise concluída: ${resultado.concluidas} conversas`)
      }
    } finally {
      setRodando(false)
      await carregarContadores()
    }
  }

  function pararAnalise() {
    cancelRef.current = true
  }

  const barColor = rodando ? 'bg-blue-500' : progresso.pct >= 100 ? 'bg-green-500' : 'bg-blue-500'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Análise IA" />
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900">

        {/* Status */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-amber-500" />
              <span className="text-[12px] text-slate-600 dark:text-slate-300">
                <strong className="text-amber-600">{pendentes ?? '...'}</strong> aguardando análise
              </span>
            </div>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-600" />
            <div className="flex items-center gap-1.5">
              <CheckCircle size={12} className="text-green-500" />
              <span className="text-[12px] text-slate-600 dark:text-slate-300">
                <strong className="text-green-600">{analisadas ?? '...'}</strong> já analisadas
              </span>
            </div>
          </div>
          <button
            onClick={carregarContadores}
            disabled={rodando}
            className="text-[11px] text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors"
          >
            <RefreshCw size={11} />
          </button>
        </div>

        {/* Bloco principal — controle */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain size={13} className="text-purple-500" />
              <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Motor de Análise IA</p>
              <span className="text-[10px] text-slate-400">claude-sonnet-4-6</span>
            </div>
            <div className="flex items-center gap-2">
              {rodando && (
                <button
                  onClick={pararAnalise}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-[12px] font-medium transition-colors"
                >
                  <StopCircle size={12} /> Parar
                </button>
              )}
              <button
                onClick={iniciarAnalise}
                disabled={rodando}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-[12px] font-medium transition-colors"
              >
                <Brain size={12} className={rodando ? 'animate-pulse' : ''} />
                {rodando ? 'Analisando...' : 'Analisar Conversas'}
              </button>
            </div>
          </div>

          <div className="p-3 space-y-2">
            {/* Barra de progresso */}
            {(rodando || progresso.pct > 0) && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {progresso.atual > 0
                      ? `${progresso.atual} de ${progresso.total} conversas${progresso.erros > 0 ? ` · ${progresso.erros} erros` : ''}`
                      : 'Iniciando...'}
                  </span>
                  <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
                    {progresso.pct > 0 ? `${progresso.pct}%` : ''}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barColor} ${progresso.pct === 0 && rodando ? 'animate-pulse w-full' : ''}`}
                    style={progresso.pct > 0 ? { width: `${progresso.pct}%` } : {}}
                  />
                </div>
              </div>
            )}

            {/* Terminal de log */}
            <div
              className="h-44 overflow-y-auto bg-slate-950 rounded p-2.5 font-mono text-[11px] space-y-0.5"
              style={{ scrollbarWidth: 'thin' }}
            >
              {logs.length === 0 && !rodando && (
                <p className="text-slate-500">Aguardando início da análise...</p>
              )}
              {logs.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-slate-600 shrink-0">{l.ts}</span>
                  <LogLine msg={l.msg} />
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>

            <p className="text-[10px] text-slate-400">
              Processa em lotes de 100 · delay 500ms entre análises · prioridade: conversas mais recentes
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {/* Distribuição em tempo real */}
          {[
            { label: 'Quentes',  key: 'quente',  icon: Flame,      color: 'text-red-500',   bg: 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800' },
            { label: 'Mornos',   key: 'morno',   icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800' },
            { label: 'Frios',    key: 'frio',    icon: Snowflake,  color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-700' },
            { label: 'Vendidos', key: 'vendido', icon: ShoppingBag,color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' },
          ].map(({ label, key, icon: Icon, color, bg }) => (
            <div key={key} className={`rounded-[6px] border p-3 flex items-center gap-3 ${bg}`}>
              <Icon size={18} className={color} />
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
                <p className="text-[20px] font-bold text-slate-800 dark:text-slate-100">{dist[key]}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabela de resultados em tempo real */}
        {resultados.length > 0 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
              <CheckCircle size={13} className="text-green-500" />
              <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Resultados em tempo real</p>
              <span className="ml-auto text-[11px] text-slate-400">últimos {resultados.length}</span>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
              <table className="w-full">
                <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-500 uppercase">Contato</th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-500 uppercase">Consultora</th>
                    <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-slate-500 uppercase w-28">Score</th>
                    <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-slate-500 uppercase">Classif.</th>
                    <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-slate-500 uppercase">Chance</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-3 py-1.5">
                        <p className="text-[12px] font-medium text-slate-800 dark:text-slate-200 truncate max-w-[140px]">{r.contato_nome || r.contato_numero}</p>
                      </td>
                      <td className="px-3 py-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[100px]">{r.consultora}</td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <ScoreBar score={r.score_ia} height={4} />
                          <span className="text-[11px] font-semibold tabular-nums" style={{ color: getScoreColor(r.score_ia) }}>{r.score_ia}</span>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <ClassBadge cls={r.classificacao_ia} />
                      </td>
                      <td className="px-3 py-1.5 text-right text-[12px] font-semibold text-green-600">{r.chance_fechamento}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
