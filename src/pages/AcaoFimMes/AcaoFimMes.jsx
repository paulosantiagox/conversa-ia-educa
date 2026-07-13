import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Target, Copy, Eye, RefreshCw, Download, DollarSign, Link, Users, Tag, Webhook, Play, Pause, X, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'
import { processarLote, processarLead, detectarCodConsultora } from '../../lib/valorEnviado'

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function fmtData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function StatCard({ label, value, sub, cor, icon: Icon }) {
  const cores = {
    amarelo: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    roxo:    'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    verde:   'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    cinza:   'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
    laranja: 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  }
  return (
    <div className={`border rounded-[6px] px-3 py-2.5 flex-1 min-w-0 ${cores[cor] ?? cores.cinza}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon size={12} className="opacity-70" />}
        <p className="text-[11px] font-medium opacity-80">{label}</p>
      </div>
      <p className="text-[22px] font-bold leading-none">{value ?? '…'}</p>
      {sub && <p className="text-[10px] opacity-60 mt-1">{sub}</p>}
    </div>
  )
}

const COR_CODIGO = { vtv: 'blue', vjc: 'purple', vkm: 'green', outros: 'slate' }
const NOME_CODIGO = { vtv: 'Tatiane', vjc: 'Júlia', vkm: 'Ketlen', outros: 'Outros' }

function ConsultoraCard({ codigo, nome, total, ativo, onClick }) {
  const cores = {
    blue:   { borda: 'border-blue-200 dark:border-blue-700',   bg: 'bg-blue-50 dark:bg-blue-900/20',   tx: 'text-blue-600 dark:text-blue-400',   tag: 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300' },
    purple: { borda: 'border-purple-200 dark:border-purple-700', bg: 'bg-purple-50 dark:bg-purple-900/20', tx: 'text-purple-600 dark:text-purple-400', tag: 'bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300' },
    green:  { borda: 'border-green-200 dark:border-green-700',  bg: 'bg-green-50 dark:bg-green-900/20',  tx: 'text-green-600 dark:text-green-400',  tag: 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300' },
    slate:  { borda: 'border-slate-200 dark:border-slate-600',  bg: 'bg-slate-50 dark:bg-slate-800',     tx: 'text-slate-500 dark:text-slate-400',  tag: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400' },
  }
  const c = cores[COR_CODIGO[codigo] ?? 'slate']
  return (
    <button onClick={onClick}
      className={`flex-1 min-w-0 border rounded-[6px] px-3 py-2.5 text-left transition-all cursor-pointer ${
        ativo
          ? `${c.borda} ${c.bg} ring-2 ring-offset-1 ring-current`
          : `border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:${c.bg}`
      }`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${c.tag}`}>{codigo.toUpperCase()}</span>
      </div>
      <p className={`text-[20px] font-bold leading-none ${ativo ? c.tx : 'text-slate-700 dark:text-slate-200'}`}>
        {total?.toLocaleString('pt-BR') ?? '…'}
      </p>
      <p className={`text-[11px] font-medium mt-0.5 ${ativo ? c.tx : 'text-slate-500'}`}>{nome}</p>
    </button>
  )
}

const UTM_CODES = { vjc: 'Júlia', vtv: 'Tatiane', vkm: 'Ketlen' }

function parseLink(url) {
  if (!url) return null
  const slugM = url.match(/\/pay\/([^?&\s]+)/)
  const utmM  = url.match(/utm_source=cod-([a-zA-Z0-9]+)/i)
  const utmCode = utmM?.[1]?.toLowerCase() ?? null
  return { url, slug: slugM?.[1] ?? null, utmCode, consultoraNome: utmCode ? (UTM_CODES[utmCode] ?? utmCode) : null }
}

function fmtMsgCSV(m) {
  if (!m?.conteudo) return ''
  const quem = m.de === 'lead' ? '👤' : '💬'
  const hora = m.enviado_at ? new Date(m.enviado_at).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : ''
  return `${quem} [${hora}] ${m.conteudo}`
}

function exportCSV(dados, aba, codigo) {
  const headers = ['Nome','Número','Consultora','Classificação','Score',
    'Recebeu Valor Em','Recebeu Link Em','Link','Slug','UTM','Consultora Link',
    'Última Mensagem','Última Msg Lead','Instância','Instância Número',
    'Msg 1 (mais antiga)','Msg 2','Msg 3','Msg 4','Msg 5 (mais recente)']
  const rows = dados.map(r => {
    const msgs = Array.isArray(r.ultimas_msgs) ? r.ultimas_msgs : []
    return [
      r.contato_nome ?? '', r.contato_numero ?? '', r.consultora ?? '',
      r.classificacao_ia ?? '', r.score_ia ?? '',
      r.valor_enviado_at ? new Date(r.valor_enviado_at).toLocaleString('pt-BR') : '',
      r.link_enviado_at  ? new Date(r.link_enviado_at).toLocaleString('pt-BR')  : '',
      r.link_url ?? '', r.link_slug ?? '', r.link_utm_code ?? '', r.link_consultora_nome ?? '',
      r.ultima_mensagem_at      ? new Date(r.ultima_mensagem_at).toLocaleString('pt-BR')      : '',
      r.ultima_mensagem_lead_at ? new Date(r.ultima_mensagem_lead_at).toLocaleString('pt-BR') : '',
      r.instancia ?? '', r.instancia_numero ?? '',
      fmtMsgCSV(msgs[0]), fmtMsgCSV(msgs[1]), fmtMsgCSV(msgs[2]),
      fmtMsgCSV(msgs[3]), fmtMsgCSV(msgs[4]),
    ]
  })
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `acao-fim-mes-${aba}${codigo ? '-' + codigo : ''}-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
}

const ABAS = [
  { key: 'valor_sem_link',  label: 'Receberam Valor (sem link)',  statsKey: 'total_valor_sem_link',  cor: 'amarelo' },
  { key: 'link_sem_compra', label: 'Receberam Link (sem compra)', statsKey: 'total_link_sem_compra', cor: 'roxo' },
  { key: 'link_todos',      label: 'Todos com Link',              statsKey: 'total_link',            cor: 'cinza' },
]

const COD_COR  = { vtv: 'bg-blue-100 text-blue-700', vjc: 'bg-purple-100 text-purple-700', vkm: 'bg-green-100 text-green-700', outros: 'bg-slate-100 text-slate-500' }
const FONTE_COR = { utm: 'text-green-600', instancia: 'text-blue-500', consultora: 'text-amber-500', desconhecido: 'text-red-500' }
const FONTE_LAB = { utm: 'UTM', instancia: 'Instância', consultora: 'Atendente', desconhecido: '?' }

// ─── Modal de processamento em lote ─────────────────────────────────────────
function ModalProcessar({ leads, onClose, onConcluido }) {
  const [logs, setLogs]           = useState([])
  const [prog, setProg]           = useState(null)
  const [rodando, setRodando]     = useState(false)
  const [pausado, setPausado]     = useState(false)
  const [concluido, setConcluido] = useState(false)
  const [delaySeg, setDelaySeg]   = useState(3)
  const cancelRef = useRef(false)
  const pausadoRef = useRef(false)
  const logsEndRef = useRef(null)

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [logs])

  // Sincroniza ref com estado para o processarLote ler sem closure stale
  useEffect(() => { pausadoRef.current = pausado }, [pausado])

  async function iniciar() {
    cancelRef.current = false
    pausadoRef.current = false
    setPausado(false)
    setRodando(true)
    setLogs([`ℹ Iniciando — ${leads.length} lead(s) · intervalo: ${delaySeg}s`])
    setProg({ atual: 0, total: leads.length, ok: 0, pulados: 0, erros: 0, pct: 0 })

    await processarLote(leads, {
      onLog:      (msg) => setLogs(prev => [...prev, msg]),
      onProgress: (p)   => setProg(p),
      onCancel:   ()    => cancelRef.current,
      isPaused:   ()    => pausadoRef.current,
      delayMs:    delaySeg * 1000,
    })

    setRodando(false)
    setConcluido(true)
    onConcluido?.()
  }

  function togglePausa() {
    const novo = !pausado
    setPausado(novo)
    setLogs(prev => [...prev, novo ? '⏸ Pausado — aguardando retomada...' : '▶ Retomado'])
  }

  // Enriquece lead com detecção de consultora para exibição
  const leadsComDeteccao = leads.map(l => {
    const det = detectarCodConsultora(l)
    return { ...l, _det: det }
  })

  // Conflitos: leads onde fonte não é UTM e cod difere do link_utm_code (se existir)
  const comConflito = leadsComDeteccao.filter(l =>
    l.link_utm_code && l._det.fonte !== 'utm' && l._det.cod !== l.link_utm_code?.toLowerCase()
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-[8px] border border-slate-200 dark:border-slate-700 w-[620px] max-h-[92vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Tag size={14} className="text-purple-500" />
            <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
              Aplicar Tag + Enviar Webhook
            </p>
            <span className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded-full font-mono">
              VALOR ENVIADO - EED
            </span>
          </div>
          {!rodando && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
          )}
        </div>

        {/* Configuração de delay (só antes de iniciar) */}
        {!rodando && !concluido && (
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
            <label className="text-[11px] text-slate-500 flex items-center gap-2">
              <Clock size={11} />
              Intervalo entre envios:
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number" min={1} max={60} value={delaySeg}
                onChange={e => setDelaySeg(Math.max(1, Number(e.target.value)))}
                className="w-14 px-2 py-1 text-[12px] font-mono border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-center"
              />
              <span className="text-[11px] text-slate-400">segundos</span>
            </div>
            <span className="text-[10px] text-slate-400 ml-auto">
              ~{Math.ceil(leads.length * delaySeg / 60)} min estimado
            </span>
          </div>
        )}

        {/* Alerta de conflitos */}
        {comConflito.length > 0 && !rodando && !concluido && (
          <div className="mx-4 mt-3 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded px-3 py-2">
            <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[10px] text-amber-700 dark:text-amber-400">
              <strong>{comConflito.length} lead(s)</strong> com possível conflito — UTM presente mas consultora detectada por outra fonte. Verifique abaixo.
            </p>
          </div>
        )}

        {/* Lista de leads */}
        {!rodando && !concluido && (
          <div className="overflow-y-auto flex-1 px-4 py-3 space-y-1.5 border-b border-slate-100 dark:border-slate-700">
            <p className="text-[10px] text-slate-400 mb-2">{leads.length} leads · role para ver todos · ✓ já processados serão pulados</p>
            {leadsComDeteccao.map((l, i) => {
              const jaFeito = l.tag_dc_aplicada_at && l.webhook_enviado_at
              const conflito = l.link_utm_code && l._det.fonte !== 'utm' && l._det.cod !== l.link_utm_code?.toLowerCase()
              return (
                <div key={l.id} className={`flex items-center gap-2 text-[11px] px-2 py-1.5 rounded ${conflito ? 'bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800' : jaFeito ? 'opacity-50' : ''}`}>
                  <span className="text-slate-400 font-mono w-5 text-right shrink-0">{i + 1}.</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200 flex-1 truncate min-w-0">
                    {l.contato_nome || l.contato_numero}
                    {jaFeito && <span className="ml-1 text-[9px] text-green-500">✓ já feito</span>}
                  </span>
                  {/* Consultora detectada + fonte */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${COD_COR[l._det.cod] ?? COD_COR.outros}`}>
                      {l._det.cod.toUpperCase()}
                    </span>
                    <span className={`text-[8px] font-medium ${FONTE_COR[l._det.fonte]}`}>
                      via {FONTE_LAB[l._det.fonte]}
                    </span>
                    {conflito && <AlertTriangle size={10} className="text-amber-500" title={`UTM=${l.link_utm_code} mas detectado como ${l._det.cod}`} />}
                  </div>
                  {l.tag_dc_aplicada_at && <Tag size={9} className="text-green-500 shrink-0" />}
                  {l.webhook_enviado_at && <CheckCircle size={9} className="text-blue-500 shrink-0" />}
                </div>
              )
            })}
          </div>
        )}

        {/* Progress bar (durante/após execução) */}
        {prog && (
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-slate-500 font-mono">{prog.atual}/{prog.total}</span>
              <div className="flex items-center gap-3">
                <span className="text-green-600">✓ {prog.ok} ok</span>
                <span className="text-blue-500">⏭ {prog.pulados} pulados</span>
                {prog.erros > 0 && <span className="text-red-500">✗ {prog.erros} erros</span>}
              </div>
              <span className="text-slate-400 font-mono">{prog.pct}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${pausado ? 'bg-amber-400' : 'bg-purple-500'}`}
                style={{ width: `${prog.pct}%` }}
              />
            </div>
            {pausado && (
              <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
                <Pause size={9} /> Pausado — clique em Retomar para continuar
              </p>
            )}
          </div>
        )}

        {/* Log */}
        {(rodando || concluido) && (
          <div className="overflow-y-auto px-4 py-3 bg-slate-50 dark:bg-slate-900/50 font-mono text-[10px] space-y-0.5 min-h-[100px] max-h-[180px]">
            {logs.map((l, i) => (
              <p key={i} className={
                l.startsWith('✓') ? 'text-green-600' :
                l.startsWith('✗') ? 'text-red-500' :
                l.startsWith('⚠') ? 'text-amber-500' :
                l.startsWith('⏭') ? 'text-slate-400' :
                l.startsWith('🏷') ? 'text-purple-600' :
                l.startsWith('📤') ? 'text-blue-600' :
                l.startsWith('⏸') ? 'text-amber-500' :
                l.startsWith('▶') ? 'text-green-500' :
                l.startsWith('⛔') ? 'text-red-600' :
                'text-slate-500'
              }>{l}</p>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700">
          {!rodando && !concluido ? (
            <>
              <button onClick={onClose} className="px-3 py-1.5 text-[11px] text-slate-500 hover:text-slate-700 border border-slate-200 dark:border-slate-600 rounded">
                Cancelar
              </button>
              <button onClick={iniciar}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-[11px] font-medium">
                <Play size={10} /> Iniciar {leads.filter(l => !l.tag_dc_aplicada_at || !l.webhook_enviado_at).length} pendentes
              </button>
            </>
          ) : rodando ? (
            <>
              <button onClick={() => { cancelRef.current = true; setPausado(false) }}
                className="px-3 py-1.5 text-[11px] text-red-500 hover:text-red-700 border border-red-200 rounded">
                Parar
              </button>
              <button onClick={togglePausa}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-[11px] font-medium ${
                  pausado
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}>
                {pausado ? <><Play size={10} /> Retomar</> : <><Pause size={10} /> Pausar</>}
              </button>
            </>
          ) : (
            <>
              <span className="text-[11px] text-green-600 flex items-center gap-1">
                <CheckCircle size={12} /> Concluído — {prog?.ok ?? 0} processados
              </span>
              <button onClick={onClose} className="px-4 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded text-[11px] font-medium">
                Fechar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function AcaoFimMes() {
  const navigate = useNavigate()
  const toast = useToast()
  const [aba, setAba] = useState('valor_sem_link')
  const [codigo, setCodigo] = useState(null)
  const [dados, setDados] = useState([])
  const [stats, setStats] = useState(null)
  const [breakdown, setBreakdown] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [modalLeads, setModalLeads] = useState(null)
  const [totalPendentes, setTotalPendentes] = useState(null)  // total real de pendentes no banco

  // Stats gerais — carrega uma vez
  useEffect(() => {
    setLoadingStats(true)
    supabase.rpc('get_leads_acao_fim_mes_stats')
      .then(({ data }) => { if (data?.[0]) setStats(data[0]) })
      .finally(() => setLoadingStats(false))
  }, [])

  // Breakdown por consultora — recarrega quando muda a aba
  useEffect(() => {
    supabase.rpc('get_leads_acao_fim_mes_por_consultora', { p_aba: aba })
      .then(({ data }) => setBreakdown(data ?? []))
  }, [aba])

  // Conta total real de pendentes no banco (sem limit)
  const carregarTotalPendentes = useCallback(async () => {
    const { data } = await supabase
      .from('ci_conversas')
      .select('*', { count: 'exact', head: true })
      .eq('recebeu_valor', true)
      .or('tag_dc_aplicada_at.is.null,webhook_enviado_at.is.null')
    setTotalPendentes(data !== undefined ? data : null)
  }, [])

  useEffect(() => {
    supabase
      .from('ci_conversas')
      .select('id', { count: 'exact', head: true })
      .eq('recebeu_valor', true)
      .or('tag_dc_aplicada_at.is.null,webhook_enviado_at.is.null')
      .then(({ count }) => setTotalPendentes(count ?? 0))
  }, [aba])

  // Dados da tabela
  const carregar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_leads_acao_fim_mes', {
      p_aba:    aba,
      p_codigo: codigo,
      p_lim:    300,
    })
    if (error) toast.error('Erro: ' + error.message)
    else setDados(data ?? [])
    setLoading(false)
  }, [aba, codigo]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { carregar() }, [carregar])

  function copiar(texto) { navigator.clipboard.writeText(texto); toast.success('Copiado!') }

  const abaAtual = ABAS.find(a => a.key === aba)
  const totalAbaAtual = stats?.[abaAtual?.statsKey]

  // Abre modal — busca TODOS os pendentes em páginas de 1000 (sem limite total)
  async function abrirProcessar() {
    let todos = []
    let offset = 0
    const BATCH = 1000
    while (true) {
      const { data, error } = await supabase
        .rpc('get_leads_pendentes_tag_webhook', { p_aba: aba, p_codigo: codigo ?? null })
        .range(offset, offset + BATCH - 1)
      if (error) { toast.error('Erro ao buscar pendentes: ' + error.message); return }
      if (!data?.length) break
      todos = [...todos, ...data]
      if (data.length < BATCH) break
      offset += BATCH
    }
    setModalLeads(todos)
  }

  // Processa um único lead
  async function processarUm(lead) {
    try {
      await processarLead(lead, {
        onLog: (msg) => {
          if (msg.startsWith('✓') || msg.startsWith('🏷') || msg.startsWith('📤')) toast.success(msg)
          else if (msg.startsWith('✗')) toast.error(msg)
        },
        pularSeJaFeito: false,  // força reprocessar ao clicar manual
      })
      carregar()
    } catch (err) {
      toast.error('Erro: ' + err.message)
    }
  }

  // Cards de consultora: Todas + breakdown + Outros
  const codigoAtivo = codigo

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Ação Final de Mês" />
      {modalLeads && (
        <ModalProcessar
          leads={modalLeads}
          onClose={() => { setModalLeads(null); carregar() }}
          onConcluido={() => {
            carregar()
            // Recarrega total real de pendentes
            supabase
              .from('ci_conversas')
              .select('id', { count: 'exact', head: true })
              .eq('recebeu_valor', true)
              .or('tag_dc_aplicada_at.is.null,webhook_enviado_at.is.null')
              .then(({ count }) => setTotalPendentes(count ?? 0))
          }}
        />
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900">

        {/* Stats gerais */}
        <div className="flex gap-2">
          <StatCard label="Receberam o valor"  value={loadingStats ? '…' : stats?.total_valor?.toLocaleString('pt-BR')}        sub="Proposta de preço enviada"        cor="amarelo" icon={DollarSign} />
          <StatCard label="Valor sem link"      value={loadingStats ? '…' : stats?.total_valor_sem_link?.toLocaleString('pt-BR')} sub="Não chegaram ao link"             cor="laranja" icon={Users} />
          <StatCard label="Receberam o link"    value={loadingStats ? '…' : stats?.total_link?.toLocaleString('pt-BR')}          sub="Chegaram à página de pagamento"  cor="roxo"    icon={Link} />
          <StatCard label="Link sem compra"     value={loadingStats ? '…' : stats?.total_link_sem_compra?.toLocaleString('pt-BR')} sub="Hot leads — prontos para fechar" cor="verde"   icon={Target} />
        </div>

        {/* Abas principais */}
        <div className="flex items-center gap-0.5 border-b border-slate-200 dark:border-slate-700">
          {ABAS.map(a => (
            <button key={a.key}
              onClick={() => { setAba(a.key); setCodigo(null) }}
              className={`flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium border-b-2 -mb-px transition-colors ${
                aba === a.key
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}>
              {a.label}
              {stats?.[a.statsKey] != null && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${aba === a.key ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                  {Number(stats[a.statsKey]).toLocaleString('pt-BR')}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Painel de breakdown por consultora */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide px-0.5">
            Distribuição por consultora · clique para filtrar
          </p>
          <div className="flex gap-2">
            {/* Card "Todas" */}
            <button
              onClick={() => setCodigo(null)}
              className={`flex-1 min-w-0 border rounded-[6px] px-3 py-2.5 text-left transition-all ${
                codigoAtivo === null
                  ? 'border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 ring-2 ring-offset-1 ring-orange-400'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50'
              }`}>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">TODAS</span>
              <p className={`text-[20px] font-bold leading-none mt-1 ${codigoAtivo === null ? 'text-orange-600 dark:text-orange-400' : 'text-slate-700 dark:text-slate-200'}`}>
                {totalAbaAtual != null ? Number(totalAbaAtual).toLocaleString('pt-BR') : '…'}
              </p>
              <p className={`text-[11px] font-medium mt-0.5 ${codigoAtivo === null ? 'text-orange-500' : 'text-slate-500'}`}>Todas as consultoras</p>
            </button>

            {/* Cards por código */}
            {['vtv', 'vjc', 'vkm', 'outros'].map(cod => {
              const item = breakdown.find(b => b.codigo === cod)
              return (
                <ConsultoraCard
                  key={cod}
                  codigo={cod}
                  nome={NOME_CODIGO[cod] ?? cod}
                  total={item?.total ?? 0}
                  ativo={codigoAtivo === cod}
                  onClick={() => setCodigo(codigoAtivo === cod ? null : cod)}
                />
              )
            })}
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Target size={13} className="text-orange-500" />
              <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                {loading ? '…' : `${dados.length.toLocaleString('pt-BR')} leads`}
              </p>
              <span className="text-[11px] text-slate-400">· {abaAtual?.label}</span>
              {codigoAtivo && (
                <span className="text-[10px] bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-medium">
                  {codigoAtivo.toUpperCase()} · {NOME_CODIGO[codigoAtivo]}
                  <button onClick={() => setCodigo(null)} className="ml-1 opacity-60 hover:opacity-100">×</button>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={carregar} disabled={loading}
                className="text-[11px] text-slate-400 hover:text-blue-500 flex items-center gap-1 disabled:opacity-50">
                <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
              </button>
              {/* Contadores de status — usa total real do banco */}
              <div className="flex items-center gap-2 text-[10px]">
                {totalPendentes === 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle size={10} /> Todos processados
                  </span>
                )}
                {totalPendentes > 0 && (
                  <span className="flex items-center gap-1 text-amber-500">
                    <Clock size={10} /> {totalPendentes.toLocaleString('pt-BR')} pendentes
                  </span>
                )}
              </div>
              {/* Botão processar lote */}
              {totalPendentes > 0 && (
                <button
                  onClick={() => abrirProcessar()}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-[11px] font-medium transition-colors">
                  <Tag size={10} /> Tag + Webhook ({totalPendentes.toLocaleString('pt-BR')})
                </button>
              )}
              <button
                onClick={() => exportCSV(dados, aba, codigoAtivo)}
                disabled={dados.length === 0}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-[11px] font-medium disabled:opacity-40 transition-colors">
                <Download size={11} /> Exportar CSV
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw size={18} className="animate-spin text-slate-400" />
            </div>
          ) : dados.length === 0 ? (
            <p className="text-center text-[12px] text-slate-400 py-12">Nenhum lead encontrado</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Contato</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Consultora</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Recebeu Valor</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Link · UTM</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Última Msg</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide w-56">Últimas Mensagens</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Instância</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Score</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Tag · Webhook</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.map(r => {
                    const link = parseLink(r.link_url)
                    return (
                      <tr key={r.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors align-top">
                        <td className="px-3 py-2.5">
                          <p className="text-[12px] font-medium text-slate-800 dark:text-slate-200">{r.contato_nome || r.contato_numero || '—'}</p>
                          {r.contato_numero && (
                            <button onClick={() => copiar(r.contato_numero)}
                              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-500 transition-colors font-mono mt-0.5">
                              <Copy size={9} /> {r.contato_numero}
                            </button>
                          )}
                          {r.classificacao_ia && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block ${
                              r.classificacao_ia === 'quente' ? 'bg-red-100 text-red-600' :
                              r.classificacao_ia === 'morno'  ? 'bg-amber-100 text-amber-600' :
                              'bg-slate-100 text-slate-400'}`}>{r.classificacao_ia}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">{r.consultora ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          {r.valor_enviado_at ? (
                            <div>
                              <p className="text-[10px] text-amber-600 font-medium">{fmtData(r.valor_enviado_at)}</p>
                              <p className="text-[9px] text-slate-400">{fmt(r.valor_enviado_at).split(' ')[1]}</p>
                            </div>
                          ) : <span className="text-[10px] text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          {link ? (
                            <div className="space-y-0.5">
                              <p className="text-[10px] text-purple-600 font-medium">{fmtData(r.link_enviado_at)}</p>
                              {link.slug && <p className="text-[9px] text-slate-500 font-mono bg-slate-50 dark:bg-slate-700 px-1 py-0.5 rounded">{link.slug}</p>}
                              {link.utmCode && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold font-mono inline-block ${
                                  link.utmCode === 'vtv' ? 'bg-blue-100 text-blue-700' :
                                  link.utmCode === 'vjc' ? 'bg-purple-100 text-purple-700' :
                                  link.utmCode === 'vkm' ? 'bg-green-100 text-green-700' :
                                  'bg-slate-100 text-slate-500'}`}>
                                  {link.utmCode} · {link.consultoraNome ?? '?'}
                                </span>
                              )}
                              <button onClick={() => copiar(link.url)}
                                className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-purple-500 transition-colors">
                                <Copy size={8} /> link
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-300">Sem link</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="text-[10px] text-slate-500">{fmt(r.ultima_mensagem_at)}</p>
                          {r.ultima_mensagem_lead_at && (
                            <p className="text-[9px] text-slate-400 mt-0.5">Lead: {fmt(r.ultima_mensagem_lead_at)}</p>
                          )}
                        </td>
                        {/* Últimas 5 mensagens — mais antiga (1) → mais recente (5) */}
                        <td className="px-3 py-2.5 max-w-[220px]">
                          <div className="space-y-1">
                            {Array.isArray(r.ultimas_msgs) && r.ultimas_msgs.length > 0
                              ? r.ultimas_msgs.map((m, i) => (
                                <div key={i} className={`text-[9px] rounded px-1.5 py-1 ${
                                  m.de === 'lead'
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                    : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>
                                  <span className="font-semibold opacity-60 mr-1 block">
                                    {m.de === 'lead' ? '👤' : '💬'} {fmt(m.enviado_at)}
                                    {i === r.ultimas_msgs.length - 1 && <span className="ml-1 text-[8px] text-orange-400">← recente</span>}
                                  </span>
                                  <span className="line-clamp-2 break-words">{m.conteudo}</span>
                                </div>
                              ))
                              : <span className="text-[9px] text-slate-300">—</span>
                            }
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {r.instancia ? (
                            <div>
                              <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium">{r.instancia}</p>
                              {r.instancia_numero && (
                                <button onClick={() => copiar(r.instancia_numero)}
                                  className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-blue-500 font-mono">
                                  <Copy size={8} /> {r.instancia_numero}
                                </button>
                              )}
                            </div>
                          ) : <span className="text-[10px] text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          {r.score_ia != null ? (
                            <span className={`text-[11px] font-bold ${r.score_ia >= 70 ? 'text-green-600' : r.score_ia >= 40 ? 'text-amber-500' : 'text-slate-400'}`}>
                              {r.score_ia}
                            </span>
                          ) : <span className="text-[10px] text-slate-300">—</span>}
                        </td>
                        {/* Coluna Tag + Webhook */}
                        <td className="px-3 py-2.5">
                          <div className="space-y-1">
                            {/* Tag */}
                            <div className={`flex items-center gap-1 text-[9px] font-medium ${r.tag_dc_aplicada_at ? 'text-green-600' : 'text-slate-300'}`}>
                              <Tag size={9} />
                              {r.tag_dc_aplicada_at
                                ? <span title={new Date(r.tag_dc_aplicada_at).toLocaleString('pt-BR')}>Tag ✓</span>
                                : <span>Tag —</span>}
                            </div>
                            {/* Webhook */}
                            <div className={`flex items-center gap-1 text-[9px] font-medium ${r.webhook_enviado_at ? 'text-blue-600' : 'text-slate-300'}`}>
                              <Webhook size={9} />
                              {r.webhook_enviado_at
                                ? <span title={new Date(r.webhook_enviado_at).toLocaleString('pt-BR')}>Webhook ✓</span>
                                : <span>Webhook —</span>}
                            </div>
                            {/* Código consultora detectado */}
                            {r.cod_consultora && (
                              <span className={`text-[8px] font-bold font-mono px-1 py-0.5 rounded ${
                                r.cod_consultora === 'vtv' ? 'bg-blue-100 text-blue-700' :
                                r.cod_consultora === 'vjc' ? 'bg-purple-100 text-purple-700' :
                                r.cod_consultora === 'vkm' ? 'bg-green-100 text-green-700' :
                                'bg-slate-100 text-slate-500'}`}>
                                {r.cod_consultora.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col gap-1">
                            <button onClick={() => navigate(`/inbox?id=${r.id}`)}
                              className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[11px] text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap">
                              <Eye size={10} /> Ver
                            </button>
                            {(!r.tag_dc_aplicada_at || !r.webhook_enviado_at) && (
                              <button onClick={() => processarUm(r)}
                                className="flex items-center gap-1 px-2 py-1 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded text-[10px] text-purple-600 hover:bg-purple-100 transition-colors whitespace-nowrap">
                                <Tag size={9} /> Enviar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
