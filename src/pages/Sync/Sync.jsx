import { useState, useEffect, useRef } from 'react'
import { RefreshCw, CheckCircle, XCircle, Clock, Database, MessageSquare, StopCircle, AlertTriangle, Brain, Zap, Info, Volume2, Mic, Timer } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { useToast } from '../../contexts/ToastContext'
import { useSync } from '../../contexts/SyncContext'
import { supabase } from '../../lib/supabase'
import { fetchConversations } from '../../lib/datacrazy'
import { estimarTempo } from '../../lib/syncMensagens'
import { contarPendentes, contarAnalisadas } from '../../lib/rodarAnalise'
import { resyncAudios } from '../../lib/resyncAudios'

function StatusBadgeConn({ ok, testando }) {
  if (testando) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400">
      <RefreshCw size={10} className="animate-spin" /> Testando...
    </span>
  )
  return ok
    ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-600 dark:text-green-400"><CheckCircle size={10} /> API Conectada</span>
    : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400"><XCircle size={10} /> Erro de conexão</span>
}

function SyncBadge({ status }) {
  const map = {
    rodando:   'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400',
    concluido: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-600 dark:text-green-400',
    erro:      'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-600 dark:text-red-400',
    cancelado: 'bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-500 text-slate-500 dark:text-slate-400',
  }
  const cls = map[status] ?? 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500'
  return <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold uppercase ${cls}`}>{status}</span>
}

function SaudeBadge({ conversas, apiTotal }) {
  if (conversas === 0)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-600 dark:text-red-400"><XCircle size={9} /> Banco vazio</span>
  if (apiTotal && conversas < apiTotal * 0.8)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400"><AlertTriangle size={9} /> Sync incompleto</span>
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-600 dark:text-green-400"><CheckCircle size={9} /> Banco atualizado</span>
}

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

function ModeCard({ modo, selected, onSelect, titulo, descricao, tempo, aviso }) {
  return (
    <button
      onClick={() => onSelect(modo)}
      className={`flex-1 border rounded-[6px] p-2.5 text-left transition-colors ${
        selected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-500'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[11px] font-bold uppercase tracking-wide ${selected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>{titulo}</span>
        {selected && <CheckCircle size={11} className="text-blue-500" />}
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{descricao}</p>
      <p className={`text-[10px] mt-1 font-medium ${aviso ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`}>{tempo}</p>
    </button>
  )
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function duracao(ini, fim) {
  if (!ini || !fim) return '—'
  const s = Math.round((new Date(fim) - new Date(ini)) / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function fmtMs(ms) {
  if (!ms) return '—'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}min ${s % 60}s`
}

const CLASS_COLORS = {
  quente:  'text-red-500',
  morno:   'text-amber-500',
  frio:    'text-slate-400',
  vendido: 'text-green-500',
  perdido: 'text-slate-500',
}

export function Sync() {
  const toast = useToast()
  const {
    syncConversasAtivo, syncConversasProgresso, syncConversasLogs, syncConversasResumo,
    iniciarSyncConversas, pararSyncConversas,
    syncMensagensAtivo, syncMensagensProgresso, syncMensagensLogs, syncMensagensResumo,
    iniciarSyncMensagens, pararSyncMensagens,
    analiseAtiva, analiseProgresso, analiseLogs, analiseResultados, analiseDist,
    iniciarAnalise, pararAnalise,
    whisperAtivo, whisperLogs, whisperProgresso, whisperResultado, whisperPendentes,
    whisperSemCredito, setWhisperSemCredito,
    modoWhisper, setModoWhisper, iniciarWhisper, pararWhisper,
    autoSyncAtivo, ultimoAutoSync, proximoAutoSync,
    ativarAutoSync, desativarAutoSync,
  } = useSync()

  // --- Estado local (não precisa persistir) ---
  const [apiOk, setApiOk] = useState(null)
  const [testando, setTestando] = useState(true)
  const [apiTotal, setApiTotal] = useState(null)
  const [historico, setHistorico] = useState([])
  const [stats, setStats] = useState({ conversas: 0, mensagens: 0, ultimoSync: null })
  const [modoMsg, setModoMsg] = useState('teste')
  const [modoIA, setModoIA] = useState('teste')
  const [statsIA, setStatsIA] = useState({ pendentes: 0, analisadas: 0 })
  const [resyncAtivo, setResyncAtivo] = useState(false)
  const [resyncLogs, setResyncLogs] = useState([])
  const [resyncProgresso, setResyncProgresso] = useState(null)
  const [resyncResultado, setResyncResultado] = useState(null)
  const resyncCancelRef = useRef(false)
  const logsResyncContainerRef = useRef(null)

  const logsWhisperContainerRef = useRef(null)
  const logsContainerRef = useRef(null)
  const logsMsgContainerRef = useRef(null)
  const logsIAContainerRef = useRef(null)

  useEffect(() => { testarConexao() }, [])
  useEffect(() => { carregarHistorico(); carregarStats() }, [])
  useEffect(() => { carregarStatsIA() }, [])
  useEffect(() => { if (logsContainerRef.current) logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight }, [syncConversasLogs])
  useEffect(() => { if (logsMsgContainerRef.current) logsMsgContainerRef.current.scrollTop = logsMsgContainerRef.current.scrollHeight }, [syncMensagensLogs])
  useEffect(() => { if (logsIAContainerRef.current) logsIAContainerRef.current.scrollTop = logsIAContainerRef.current.scrollHeight }, [analiseLogs])
  useEffect(() => { if (logsResyncContainerRef.current) logsResyncContainerRef.current.scrollTop = logsResyncContainerRef.current.scrollHeight }, [resyncLogs])
  useEffect(() => { if (logsWhisperContainerRef.current) logsWhisperContainerRef.current.scrollTop = logsWhisperContainerRef.current.scrollHeight }, [whisperLogs])

  async function testarConexao() {
    setTestando(true)
    try {
      const resultado = await fetchConversations(0, 1)
      setApiOk(true)
      const total = resultado?.total ?? resultado?.meta?.total ?? resultado?.pagination?.total ?? null
      if (total) setApiTotal(total)
    } catch {
      setApiOk(false)
    } finally {
      setTestando(false)
    }
  }

  async function carregarHistorico() {
    const { data } = await supabase
      .from('ci_sync_logs')
      .select('*')
      .order('iniciado_at', { ascending: false })
      .limit(10)
    setHistorico(data ?? [])
  }

  async function carregarStats() {
    const [{ count: countC }, { count: countM }, { data: ultimoLog }] = await Promise.all([
      supabase.from('ci_conversas').select('*', { count: 'exact', head: true }),
      supabase.from('ci_mensagens').select('*', { count: 'exact', head: true }),
      supabase.from('ci_sync_logs').select('finalizado_at').eq('status', 'concluido').order('finalizado_at', { ascending: false }).limit(1),
    ])
    setStats({
      conversas: countC ?? 0,
      mensagens: countM ?? 0,
      ultimoSync: ultimoLog?.[0]?.finalizado_at ?? null,
    })
  }

  async function carregarStatsIA() {
    const [p, a] = await Promise.all([contarPendentes(), contarAnalisadas()])
    setStatsIA({ pendentes: p, analisadas: a })
  }

  async function handleIniciarSync() {
    const resultado = await iniciarSyncConversas()
    if (!resultado) return
    if (resultado.status === 'cancelado') toast.info('Sync cancelado')
    await carregarHistorico()
    await carregarStats()
  }

  async function handleIniciarSyncMsg() {
    const resultado = await iniciarSyncMensagens(modoMsg)
    if (!resultado) return
    toast.success(`Sync de mensagens concluído: ${resultado.mensagensImportadas} importadas`)
    await carregarStats()
  }

  async function handleResyncAudios() {
    resyncCancelRef.current = false
    setResyncAtivo(true)
    setResyncLogs([])
    setResyncProgresso(null)
    setResyncResultado(null)

    const addLog = (msg) => {
      const ts = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      setResyncLogs(prev => [...prev, { ts, msg }])
    }

    const resultado = await resyncAudios(
      addLog,
      () => resyncCancelRef.current,
      (prog) => setResyncProgresso(prog)
    )

    setResyncAtivo(false)
    setResyncResultado(resultado)
    toast.success(`Re-sync concluído: ${resultado.audiosEncontrados} áudios corrigidos`)
    await carregarStats()
  }

  async function handleIniciarAnalise() {
    const resultado = await iniciarAnalise(modoIA)
    if (!resultado) return
    toast.success(`Análise concluída: ${resultado.concluidas} conversas`)
    await carregarStatsIA()
  }

  const barColor = syncConversasAtivo ? 'bg-blue-500'
    : syncConversasResumo?.status === 'concluido' ? 'bg-green-500'
    : syncConversasResumo?.status === 'erro' ? 'bg-red-500'
    : 'bg-blue-500'
  const barPct = syncConversasProgresso.pct ?? (syncConversasAtivo ? null : (syncConversasResumo ? 100 : 0))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Sync DataCrazy" />
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900">

        {/* Auto-sync */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer size={13} className="text-slate-400" />
              <div>
                <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Sincronização Automática</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Sincroniza conversas, mensagens e áudios pendentes a cada 10 min</p>
              </div>
            </div>
            {/* Toggle */}
            <button
              onClick={autoSyncAtivo ? desativarAutoSync : ativarAutoSync}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${autoSyncAtivo ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoSyncAtivo ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>
          {autoSyncAtivo ? (
            <div className="flex items-center gap-4 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <span className="flex items-center gap-1.5 text-[11px] text-green-600 dark:text-green-400 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                Auto-sync ativo
              </span>
              {ultimoAutoSync && (
                <span className="text-[11px] text-slate-400">
                  Último: {ultimoAutoSync.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
              {proximoAutoSync && (
                <span className="text-[11px] text-slate-400">
                  Próximo: {proximoAutoSync.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 mt-1.5">Desativado — sync manual apenas</p>
          )}
        </div>

        {/* Status da conexão */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] px-3 py-2.5 flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Conexão com API DataCrazy</p>
            <p className="text-[11px] text-slate-400 mt-0.5">https://api.g1.datacrazy.io · Filtro: instâncias EEB{apiTotal ? ` · ~${apiTotal.toLocaleString('pt-BR')} conversas na API` : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadgeConn ok={apiOk} testando={testando} />
            <button
              onClick={testarConexao}
              disabled={testando}
              className="px-2.5 py-1 border border-slate-200 dark:border-slate-600 rounded text-[11px] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              Testar novamente
            </button>
          </div>
        </div>

        {/* Bloco principal — sync conversas */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw size={13} className="text-blue-500" />
              <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Sincronizar Conversas EJA</p>
            </div>
            <div className="flex items-center gap-2">
              {syncConversasAtivo && (
                <button
                  onClick={pararSyncConversas}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-[12px] font-medium transition-colors"
                >
                  <StopCircle size={12} /> Parar
                </button>
              )}
              <button
                onClick={handleIniciarSync}
                disabled={syncConversasAtivo || apiOk === false}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-[12px] font-medium transition-colors"
              >
                <RefreshCw size={12} className={syncConversasAtivo ? 'animate-spin' : ''} />
                {syncConversasAtivo ? 'Sincronizando...' : 'Sincronizar Conversas EJA'}
              </button>
            </div>
          </div>

          <div className="p-3 space-y-2">
            {(syncConversasAtivo || syncConversasResumo) && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {syncConversasProgresso.processadas > 0 || syncConversasProgresso.estimadas
                      ? `${syncConversasProgresso.processadas.toLocaleString('pt-BR')} de ~${(syncConversasProgresso.estimadas ?? '?').toLocaleString?.('pt-BR') ?? '?'} conversas EJA`
                      : syncConversasAtivo ? 'Iniciando...' : ''}
                  </span>
                  <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
                    {barPct != null ? `${barPct}%` : ''}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor} ${barPct == null ? 'animate-pulse w-full' : ''}`}
                    style={barPct != null ? { width: `${barPct}%` } : {}}
                  />
                </div>
              </div>
            )}

            <div
              ref={logsContainerRef}
              className="h-48 overflow-y-auto bg-slate-950 rounded p-2.5 font-mono text-[11px] space-y-0.5"
              style={{ scrollbarWidth: 'thin' }}
            >
              {syncConversasLogs.length === 0 && !syncConversasAtivo && (
                <p className="text-slate-500">Aguardando início do sync...</p>
              )}
              {syncConversasLogs.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-slate-600 shrink-0">{l.ts}</span>
                  <LogLine msg={l.msg} />
                </div>
              ))}
            </div>

            <p className="text-[10px] text-slate-400">
              Apenas conversas com instância começando em <strong>"EEB"</strong> são importadas. Autoflix e outros são ignorados automaticamente.
            </p>

            {syncConversasResumo && !syncConversasAtivo && (
              <div className={`rounded border p-3 text-[12px] space-y-2 ${
                syncConversasResumo.status === 'concluido' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                syncConversasResumo.status === 'erro'      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
              }`}>
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {syncConversasResumo.status === 'concluido' ? '✅ SYNC CONCLUÍDO' :
                   syncConversasResumo.status === 'erro'      ? '❌ SYNC COM ERROS' :
                   '⛔ CANCELADO'}
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                  <span>Duração total</span>             <span className="font-medium text-slate-800 dark:text-slate-100">{fmtMs(syncConversasResumo.duracaoMs)}</span>
                  <span>Conversas EJA encontradas</span> <span className="font-medium text-slate-800 dark:text-slate-100">{syncConversasResumo.totalEJA ?? 0}</span>
                  <span>Novas inseridas</span>            <span className="font-medium text-green-600">{syncConversasResumo.conversas_importadas}</span>
                  <span>Atualizadas</span>               <span className="font-medium text-blue-600">{syncConversasResumo.atualizadas}</span>
                  <span>Sem mudança</span>               <span className="font-medium text-slate-500">{syncConversasResumo.ignoradas}</span>
                  <span>Erros</span>                     <span className={`font-medium ${syncConversasResumo.erros > 0 ? 'text-red-500' : 'text-slate-400'}`}>{syncConversasResumo.erros}</span>
                  <span>Páginas varridas</span>          <span className="font-medium text-slate-800 dark:text-slate-100">{syncConversasResumo.paginasVarridas}{syncConversasResumo.totalPaginasEst ? ` / ~${syncConversasResumo.totalPaginasEst}` : ''}</span>
                  <span>Ignoradas (não-EJA)</span>       <span className="font-medium text-slate-500">{syncConversasResumo.totalIgnoradas ?? 0}</span>
                </div>
                {syncConversasResumo.erroIds?.length > 0 && (
                  <p className="text-[10px] text-red-500 break-all">IDs com erro: {syncConversasResumo.erroIds.slice(0, 10).join(', ')}{syncConversasResumo.erroIds.length > 10 ? ` +${syncConversasResumo.erroIds.length - 10}` : ''}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── SYNC DE MENSAGENS ─── */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={13} className="text-green-500" />
              <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Sync de Mensagens</p>
              <span className="text-[10px] text-slate-400">— importa mensagens das conversas já sincronizadas</span>
            </div>
            <div className="flex items-center gap-2">
              {syncMensagensAtivo && (
                <button
                  onClick={pararSyncMensagens}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-[12px] font-medium transition-colors"
                >
                  <StopCircle size={12} /> Parar
                </button>
              )}
              <button
                onClick={handleIniciarSyncMsg}
                disabled={syncMensagensAtivo}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-[12px] font-medium transition-colors"
              >
                <Zap size={12} className={syncMensagensAtivo ? 'animate-pulse' : ''} />
                {syncMensagensAtivo ? 'Sincronizando...' : 'Iniciar Sync'}
              </button>
            </div>
          </div>

          <div className="p-3 space-y-2.5">
            {/* Cards de modo */}
            <div className="flex gap-2">
              <ModeCard
                modo="teste"
                selected={modoMsg === 'teste'}
                onSelect={setModoMsg}
                titulo="TESTE"
                descricao="50 conversas mais recentes"
                tempo={estimarTempo('teste')}
              />
              <ModeCard
                modo="recentes"
                selected={modoMsg === 'recentes'}
                onSelect={setModoMsg}
                titulo="RECENTES"
                descricao="Últimos 30 dias sem mensagens"
                tempo={estimarTempo('recentes')}
              />
              <ModeCard
                modo="completo"
                selected={modoMsg === 'completo'}
                onSelect={setModoMsg}
                titulo="COMPLETO"
                descricao="Todas as conversas sem mensagens"
                tempo={`${estimarTempo('completo')} ⚠ overnight`}
                aviso
              />
            </div>

            {modoMsg === 'completo' && !syncMensagensAtivo && (
              <div className="flex items-start gap-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded px-2.5 py-2 text-[11px] text-amber-700 dark:text-amber-400">
                <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                Modo COMPLETO processa milhares de conversas. Recomendado rodar overnight sem interrupções.
              </div>
            )}

            {/* Progresso */}
            {(syncMensagensAtivo || syncMensagensResumo) && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {syncMensagensProgresso.total > 0
                      ? `${syncMensagensProgresso.atual} de ${syncMensagensProgresso.total} conversas`
                      : syncMensagensAtivo ? 'Iniciando...' : ''}
                  </span>
                  <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
                    {syncMensagensProgresso.pct != null ? `${syncMensagensProgresso.pct}%` : ''}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 bg-green-500 ${syncMensagensProgresso.pct == null ? 'animate-pulse w-full' : ''}`}
                    style={syncMensagensProgresso.pct != null ? { width: `${syncMensagensProgresso.pct}%` } : {}}
                  />
                </div>
              </div>
            )}

            {/* Terminal */}
            <div
              ref={logsMsgContainerRef}
              className="h-40 overflow-y-auto bg-slate-950 rounded p-2.5 font-mono text-[11px] space-y-0.5"
              style={{ scrollbarWidth: 'thin' }}
            >
              {syncMensagensLogs.length === 0 && !syncMensagensAtivo && (
                <p className="text-slate-500">Selecione um modo e inicie o sync de mensagens...</p>
              )}
              {syncMensagensLogs.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-slate-600 shrink-0">{l.ts}</span>
                  <LogLine msg={l.msg} />
                </div>
              ))}
            </div>

            {/* Resumo final mensagens */}
            {syncMensagensResumo && !syncMensagensAtivo && (
              <div className="rounded border p-3 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-[11px]">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px]">Conversas processadas</p>
                    <p className="text-[18px] font-bold text-slate-800 dark:text-slate-100">{syncMensagensResumo.total}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px]">Mensagens importadas</p>
                    <p className="text-[18px] font-bold text-green-600">{syncMensagensResumo.mensagensImportadas}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px]">Erros</p>
                    <p className={`text-[18px] font-bold ${syncMensagensResumo.erros > 0 ? 'text-red-500' : 'text-slate-400'}`}>{syncMensagensResumo.erros}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── ANÁLISE IA ─── */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain size={13} className="text-purple-500" />
              <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Análise IA</p>
              <span className="text-[10px] text-slate-400">— modelo claude-sonnet-4-6</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                <span><strong className="text-amber-500">{statsIA.pendentes.toLocaleString('pt-BR')}</strong> pendentes</span>
                <span><strong className="text-green-500">{statsIA.analisadas.toLocaleString('pt-BR')}</strong> analisadas</span>
              </div>
              {analiseAtiva && (
                <button
                  onClick={pararAnalise}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-[12px] font-medium transition-colors"
                >
                  <StopCircle size={12} /> Parar
                </button>
              )}
              <button
                onClick={handleIniciarAnalise}
                disabled={analiseAtiva}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-[12px] font-medium transition-colors"
              >
                <Brain size={12} className={analiseAtiva ? 'animate-pulse' : ''} />
                {analiseAtiva ? 'Analisando...' : 'Iniciar Análise'}
              </button>
            </div>
          </div>

          <div className="p-3 space-y-2.5">
            {/* Cards de modo */}
            <div className="flex gap-2">
              <ModeCard
                modo="teste"
                selected={modoIA === 'teste'}
                onSelect={setModoIA}
                titulo="TESTE"
                descricao="50 conversas mais recentes"
                tempo="~5 minutos"
              />
              <ModeCard
                modo="recentes"
                selected={modoIA === 'recentes'}
                onSelect={setModoIA}
                titulo="RECENTES"
                descricao="Últimos 30 dias sem análise"
                tempo="~30–60 minutos"
              />
              <ModeCard
                modo="completo"
                selected={modoIA === 'completo'}
                onSelect={setModoIA}
                titulo="COMPLETO"
                descricao="Todas as conversas pendentes"
                tempo="~várias horas ⚠ overnight"
                aviso
              />
            </div>

            {statsIA.pendentes === 0 && modoIA !== 'teste' && !analiseAtiva && (
              <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded px-2.5 py-2 text-[11px] text-blue-600 dark:text-blue-400">
                <Info size={11} className="shrink-0" />
                Nenhuma conversa pendente de análise. Execute o Sync de Mensagens primeiro para importar conteúdo.
              </div>
            )}

            {/* Progresso */}
            {(analiseAtiva || analiseResultados.length > 0) && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {analiseProgresso.total > 0
                      ? `${analiseProgresso.atual} de ${analiseProgresso.total} conversas`
                      : analiseAtiva ? 'Iniciando...' : ''}
                  </span>
                  <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
                    {analiseProgresso.pct != null ? `${analiseProgresso.pct}%` : ''}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 bg-purple-500 ${analiseProgresso.pct == null ? 'animate-pulse w-full' : ''}`}
                    style={analiseProgresso.pct != null ? { width: `${analiseProgresso.pct}%` } : {}}
                  />
                </div>
              </div>
            )}

            {/* Terminal */}
            <div
              ref={logsIAContainerRef}
              className="h-40 overflow-y-auto bg-slate-950 rounded p-2.5 font-mono text-[11px] space-y-0.5"
              style={{ scrollbarWidth: 'thin' }}
            >
              {analiseLogs.length === 0 && !analiseAtiva && (
                <p className="text-slate-500">Selecione um modo e inicie a análise...</p>
              )}
              {analiseLogs.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-slate-600 shrink-0">{l.ts}</span>
                  <LogLine msg={l.msg} />
                </div>
              ))}
            </div>

            {/* Distribuição + tabela de resultados em tempo real */}
            {analiseResultados.length > 0 && (
              <div className="space-y-2">
                {/* Distribuição */}
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-700/50 rounded border border-slate-200 dark:border-slate-600 px-3 py-2">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mr-1">Distribuição</span>
                  {[
                    { key: 'quente',  label: 'Quentes' },
                    { key: 'morno',   label: 'Mornos' },
                    { key: 'frio',    label: 'Frios' },
                    { key: 'vendido', label: 'Vendidos' },
                    { key: 'perdido', label: 'Perdidos' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-1 text-[11px]">
                      <span className={`font-bold text-[13px] ${CLASS_COLORS[key]}`}>{analiseDist[key]}</span>
                      <span className="text-slate-400">{label}</span>
                    </div>
                  ))}
                </div>

                {/* Tabela em tempo real */}
                <div className="border border-slate-200 dark:border-slate-600 rounded overflow-hidden">
                  <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600 flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Resultados em tempo real</p>
                    <span className="text-[10px] text-slate-400">{analiseResultados.length} conversas analisadas</span>
                  </div>
                  <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '400px', scrollbarWidth: 'thin' }}>
                    <table className="w-full">
                      <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                        <tr className="border-b border-slate-100 dark:border-slate-700">
                          <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-400 uppercase">Contato</th>
                          <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-400 uppercase">Número</th>
                          <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-400 uppercase">Consultora</th>
                          <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-slate-400 uppercase">Score</th>
                          <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-slate-400 uppercase">Classificação</th>
                          <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-slate-400 uppercase">Chance</th>
                          <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-slate-400 uppercase">T. Resp.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analiseResultados.map((r, i) => {
                          const cl = (r.classificacao_ia ?? '').toLowerCase()
                          return (
                            <tr key={i} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                              <td className="px-3 py-1.5 text-[11px] text-slate-700 dark:text-slate-200 max-w-[110px] truncate">{r.contato_nome || '—'}</td>
                              <td className="px-3 py-1.5 text-[11px]">
                                {r.contato_numero ? (
                                  <button
                                    title="Clique para copiar"
                                    onClick={() => {
                                      navigator.clipboard.writeText(r.contato_numero)
                                      toast.success('Número copiado')
                                    }}
                                    className="font-mono text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline cursor-pointer transition-colors"
                                  >
                                    {r.contato_numero}
                                  </button>
                                ) : <span className="text-slate-400">—</span>}
                              </td>
                              <td className="px-3 py-1.5 text-[11px] text-slate-500 dark:text-slate-400">{r.consultora ?? '—'}</td>
                              <td className="px-3 py-1.5 text-center text-[12px] font-bold text-slate-800 dark:text-slate-100">{r.score_ia ?? '—'}</td>
                              <td className={`px-3 py-1.5 text-center text-[11px] font-semibold capitalize ${CLASS_COLORS[cl] ?? 'text-slate-400'}`}>{r.classificacao_ia ?? '—'}</td>
                              <td className="px-3 py-1.5 text-center text-[11px] text-slate-500 dark:text-slate-400">{r.chance_fechamento != null ? `${r.chance_fechamento}%` : '—'}</td>
                              <td className="px-3 py-1.5 text-center text-[11px] text-slate-400">{r.tempo_resposta_medio != null ? `${r.tempo_resposta_medio}min` : '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Re-sync de Áudios */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 size={14} className="text-purple-500" />
              <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Re-sync de Áudios</p>
            </div>
            <div className="flex items-center gap-2">
              {resyncProgresso && (
                <span className="text-[11px] text-slate-400">
                  {resyncProgresso.atual}/{resyncProgresso.total} ({resyncProgresso.pct}%)
                </span>
              )}
              {resyncAtivo ? (
                <button
                  onClick={() => { resyncCancelRef.current = true }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
                >
                  <StopCircle size={11} /> Parar
                </button>
              ) : (
                <button
                  onClick={handleResyncAudios}
                  className="flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                >
                  <Volume2 size={11} /> Corrigir Áudios
                </button>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Corrige mensagens de áudio salvas incorretamente como texto. Verifica conversas dos últimos 60 dias e preenche <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">audio_url</code> e <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">tipo=audio</code>.
          </p>

          {resyncProgresso && (
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1">
              <div
                className="bg-purple-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${resyncProgresso.pct}%` }}
              />
            </div>
          )}

          {resyncResultado && !resyncAtivo && (
            <div className="flex items-center gap-4 text-[11px] bg-slate-50 dark:bg-slate-700/50 rounded border border-slate-200 dark:border-slate-600 px-3 py-2">
              <span className="text-purple-500 font-semibold">{resyncResultado.atualizadas} conversas</span>
              <span className="text-slate-500">com áudio detectado</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{resyncResultado.audiosEncontrados} mensagens corrigidas</span>
              {resyncResultado.erros > 0 && <span className="text-amber-500">{resyncResultado.erros} erros</span>}
            </div>
          )}

          <div
            ref={logsResyncContainerRef}
            className="h-28 overflow-y-auto bg-slate-950 rounded p-2.5 font-mono text-[11px] space-y-0.5"
            style={{ scrollbarWidth: 'thin' }}
          >
            {resyncLogs.length === 0 && !resyncAtivo && (
              <p className="text-slate-500">Clique em "Corrigir Áudios" para iniciar...</p>
            )}
            {resyncLogs.map((l, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-slate-600 shrink-0">{l.ts}</span>
                <LogLine msg={l.msg} />
              </div>
            ))}
          </div>
        </div>

        {/* Transcrição de Áudios (Whisper) */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic size={14} className="text-pink-500" />
              <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Transcrição de Áudios (Whisper)</p>
              {whisperPendentes > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-pink-50 dark:bg-pink-900/30 border border-pink-200 dark:border-pink-700 text-pink-600 dark:text-pink-400">
                  {whisperPendentes} pendentes
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {whisperProgresso && (
                <span className="text-[11px] text-slate-400">
                  {whisperProgresso.atual}/{whisperProgresso.total} ({whisperProgresso.pct}%)
                </span>
              )}
              {whisperAtivo ? (
                <button
                  onClick={pararWhisper}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
                >
                  <StopCircle size={11} /> Parar
                </button>
              ) : (
                <button
                  onClick={() => iniciarWhisper(modoWhisper)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-medium bg-pink-600 text-white hover:bg-pink-700 transition-colors"
                >
                  <Mic size={11} /> Transcrever
                </button>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Usa o modelo Whisper da OpenAI para transcrever áudios das consultoras. Apenas áudios manuais (<code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">is_auto=false</code>) sem transcrição são processados.
          </p>

          {whisperSemCredito && (
            <div className="flex items-start justify-between gap-2 bg-red-950/40 border border-red-700 rounded px-3 py-2">
              <div className="flex items-center gap-2 text-[11px] text-red-400">
                <AlertTriangle size={13} className="shrink-0 text-red-500" />
                <span>
                  <strong className="text-red-300">Cota OpenAI esgotada</strong> — Transcrição pausada. Recarregue créditos em{' '}
                  <a href="https://platform.openai.com/account/billing" target="_blank" rel="noreferrer" className="underline text-red-300 hover:text-red-200">
                    platform.openai.com
                  </a>.
                </span>
              </div>
              <button
                onClick={() => setWhisperSemCredito(false)}
                className="text-red-600 hover:text-red-400 text-[11px] shrink-0 mt-0.5"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <ModeCard modo="teste" selected={modoWhisper === 'teste'} onSelect={setModoWhisper}
              titulo="Teste" descricao="5 áudios" tempo="~1 min" />
            <ModeCard modo="recentes" selected={modoWhisper === 'recentes'} onSelect={setModoWhisper}
              titulo="Recentes" descricao="200 áudios" tempo="~10 min" />
            <ModeCard modo="completo" selected={modoWhisper === 'completo'} onSelect={setModoWhisper}
              titulo="Completo" descricao="Todos os pendentes" tempo="Pode demorar horas" aviso />
          </div>

          {whisperProgresso && (
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1">
              <div
                className="bg-pink-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${whisperProgresso.pct}%` }}
              />
            </div>
          )}

          {whisperResultado && !whisperAtivo && (
            <div className="flex items-center gap-4 text-[11px] bg-slate-50 dark:bg-slate-700/50 rounded border border-slate-200 dark:border-slate-600 px-3 py-2">
              <span className="text-pink-500 font-semibold">{whisperResultado.concluidas} transcritos</span>
              {whisperResultado.erros > 0 && <span className="text-amber-500">{whisperResultado.erros} erros</span>}
              <span className="text-slate-400">{whisperPendentes} ainda pendentes</span>
            </div>
          )}

          <div
            ref={logsWhisperContainerRef}
            className="h-28 overflow-y-auto bg-slate-950 rounded p-2.5 font-mono text-[11px] space-y-0.5"
            style={{ scrollbarWidth: 'thin' }}
          >
            {whisperLogs.length === 0 && !whisperAtivo && (
              <p className="text-slate-500">Clique em "Transcrever" para iniciar...</p>
            )}
            {whisperLogs.map((l, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-slate-600 shrink-0">{l.ts}</span>
                <LogLine msg={l.msg} />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Estatísticas + saúde do banco */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Estatísticas</p>
              <SaudeBadge conversas={stats.conversas} apiTotal={apiTotal} />
            </div>
            <div className="flex items-center gap-2">
              <Database size={13} className="text-blue-500 shrink-0" />
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Conversas EJA no banco</p>
                <p className="text-[18px] font-bold text-slate-800 dark:text-slate-100">{stats.conversas.toLocaleString('pt-BR')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare size={13} className="text-green-500 shrink-0" />
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Mensagens no banco</p>
                <p className="text-[18px] font-bold text-slate-800 dark:text-slate-100">{stats.mensagens.toLocaleString('pt-BR')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={13} className="text-slate-400 shrink-0" />
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Último sync</p>
                <p className="text-[12px] font-medium text-slate-700 dark:text-slate-200">{fmt(stats.ultimoSync)}</p>
              </div>
            </div>
          </div>

          {/* Histórico de syncs */}
          <div className="col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
              <Clock size={13} className="text-slate-400" />
              <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Histórico de Syncs</p>
              <span className="ml-auto text-[11px] text-slate-400">últimos 10</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Data/Hora</th>
                    <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Duração</th>
                    <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Importadas</th>
                    <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Erros</th>
                    <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-[11px] text-slate-400">
                        Nenhum sync realizado ainda
                      </td>
                    </tr>
                  )}
                  {historico.map(h => (
                    <tr key={h.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-3 py-1.5 text-[11px] text-slate-600 dark:text-slate-300">{fmt(h.iniciado_at)}</td>
                      <td className="px-3 py-1.5 text-right text-[11px] text-slate-500 dark:text-slate-400">{duracao(h.iniciado_at, h.finalizado_at)}</td>
                      <td className="px-3 py-1.5 text-right text-[12px] font-semibold text-green-600">{h.conversas_importadas ?? 0}</td>
                      <td className="px-3 py-1.5 text-right text-[11px] text-slate-500 dark:text-slate-400">
                        {h.erros > 0
                          ? <span className="text-red-500 font-medium">{h.erros}</span>
                          : <span className="text-slate-300 dark:text-slate-600">0</span>
                        }
                      </td>
                      <td className="px-3 py-1.5 text-center"><SyncBadge status={h.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
