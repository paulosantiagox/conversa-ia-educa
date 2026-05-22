import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Sparkles, Send, RefreshCw, Eye, ToggleLeft, ToggleRight, Clock, CheckCircle, AlertTriangle, Copy, Edit2, Settings, Plus, Trash2, X, ChevronRight, Shuffle, MessageSquare, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Topbar } from '../../components/layout/Topbar'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'
import { processarFollowUpsAuto, gerarMensagemFollowUp } from '../../lib/gerarFollowUp'
import { enviarMensagem } from '../../lib/datacrazy'
import { syncMensagensConversa } from '../../lib/syncDataCrazy'
import { getTemplates, saveTemplates, resetTemplates, getAllFrases } from '../../lib/followupTemplates'

const INTERVALO_MS = 10 * 60 * 1000
const JANELA_MS = 24 * 60 * 60 * 1000

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function calcTempo(ultimaMensagemAt) {
  if (!ultimaMensagemAt) return null
  const agora = Date.now()
  const ultima = new Date(ultimaMensagemAt).getTime()
  const decorrido = agora - ultima
  const restante = JANELA_MS - decorrido
  function fmtDuracao(ms) {
    if (ms < 0) return null
    const h = Math.floor(ms / 3_600_000)
    const m = Math.floor((ms % 3_600_000) / 60_000)
    return h > 0 ? `${h}h ${m}min` : `${m}min`
  }
  return {
    decorridoMs: decorrido, restanteMs: restante,
    decorrido: fmtDuracao(decorrido),
    restante: restante > 0 ? fmtDuracao(restante) : 'Expirada',
    expirada: restante <= 0,
    critica: restante > 0 && restante < 4 * 3_600_000,
  }
}

function StatusChip({ status }) {
  if (status === 'enviado') return <span className="flex items-center gap-1 text-[10px] text-green-600 font-semibold"><CheckCircle size={10} /> Enviado</span>
  if (status === 'ignorado') return <span className="text-[10px] text-slate-400">Ignorado</span>
  return <span className="flex items-center gap-1 text-[10px] text-amber-500 font-semibold"><Clock size={10} /> Pendente</span>
}

function StatCard({ label, value, cor, sub }) {
  const cores = {
    azul:    'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    laranja: 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    roxo:    'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    cinza:   'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
    verde:   'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  }
  return (
    <div className={`border rounded-[6px] px-3 py-2.5 flex-1 min-w-0 ${cores[cor] ?? cores.cinza}`}>
      <p className="text-[20px] font-bold leading-none">{value ?? '…'}</p>
      <p className="text-[11px] font-medium mt-1 opacity-80">{label}</p>
      {sub && <p className="text-[10px] opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── FraseItem: frase individual editável no modal ───────────────────────────
function FraseItem({ frase, onSave, onDelete, canDelete }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(frase)

  function confirmar() {
    if (val.trim()) { onSave(val.trim()); setEditing(false) }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') confirmar(); if (e.key === 'Escape') setEditing(false) }}
          className="flex-1 text-[11px] border border-purple-300 dark:border-purple-600 rounded px-2 py-1 bg-white dark:bg-slate-700 dark:text-white outline-none focus:border-purple-400"
        />
        <button onClick={confirmar} className="px-2 py-1 bg-purple-600 text-white rounded text-[10px] hover:bg-purple-700 shrink-0">Ok</button>
        <button onClick={() => { setVal(frase); setEditing(false) }} className="px-2 py-1 bg-slate-100 dark:bg-slate-600 text-slate-500 rounded text-[10px] shrink-0">✕</button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 group">
      <span className="flex-1 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 truncate">
        {frase}
      </span>
      <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-500 transition-all shrink-0">
        <Edit2 size={10} />
      </button>
      <button onClick={onDelete} disabled={!canDelete} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all disabled:opacity-30 shrink-0">
        <Trash2 size={10} />
      </button>
    </div>
  )
}

// ─── Modal de Modelos ────────────────────────────────────────────────────────
function TemplatesModal({ onClose }) {
  const [templates, setTemplates] = useState(() => getTemplates())
  const [editandoId, setEditandoId] = useState(null)
  const [editForm, setEditForm] = useState({ titulo: '', emoji: '', instrucao: '' })
  const [novaFrase, setNovaFrase] = useState({}) // templateId → texto digitado
  const [novoAberto, setNovoAberto] = useState(false)
  const [novoForm, setNovoForm] = useState({ titulo: '', emoji: '💬', instrucao: '', frases: [] })

  function salvar(lista) { saveTemplates(lista); setTemplates(lista) }

  // ── Edição de cabeçalho do template ──
  function iniciarEdicao(t) {
    setEditandoId(t.id)
    setEditForm({ titulo: t.titulo, emoji: t.emoji, instrucao: t.instrucao })
    setNovoAberto(false)
  }
  function confirmarEdicao() {
    if (!editForm.titulo.trim()) return
    salvar(templates.map(t => t.id === editandoId ? { ...t, ...editForm } : t))
    setEditandoId(null)
  }
  function excluirTemplate(id) {
    if (templates.length <= 1) return
    salvar(templates.filter(t => t.id !== id))
    if (editandoId === id) setEditandoId(null)
  }

  // ── Frases individuais ──
  function salvarFrase(templateId, idx, novoTexto) {
    salvar(templates.map(t => {
      if (t.id !== templateId) return t
      const frases = [...(t.frases ?? [])]
      frases[idx] = novoTexto
      return { ...t, frases }
    }))
  }
  function excluirFrase(templateId, idx) {
    salvar(templates.map(t => {
      if (t.id !== templateId) return t
      const frases = (t.frases ?? []).filter((_, i) => i !== idx)
      return { ...t, frases }
    }))
  }
  function adicionarFrase(templateId) {
    const texto = (novaFrase[templateId] ?? '').trim()
    if (!texto) return
    salvar(templates.map(t => {
      if (t.id !== templateId) return t
      return { ...t, frases: [...(t.frases ?? []), texto] }
    }))
    setNovaFrase(prev => ({ ...prev, [templateId]: '' }))
  }

  // ── Novo template ──
  function adicionarTemplate() {
    if (!novoForm.titulo.trim()) return
    salvar([...templates, { id: Date.now().toString(), ...novoForm, frases: novoForm.frases.filter(Boolean) }])
    setNovoForm({ titulo: '', emoji: '💬', instrucao: '', frases: [] })
    setNovoAberto(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-[8px] border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <Settings size={14} className="text-purple-500" />
            <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">Modelos de Follow-up</p>
            <span className="text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-full font-medium">
              {templates.length} modelos · {templates.reduce((s, t) => s + (t.frases?.length ?? 0), 0)} frases
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setTemplates(resetTemplates()) }} className="text-[10px] text-slate-400 hover:text-slate-600 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded">
              Restaurar padrões
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={14} /></button>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {templates.map((t, tIdx) => (
            <div key={t.id} className="border border-slate-200 dark:border-slate-700 rounded-[6px] overflow-hidden">
              {/* Cabeçalho do template */}
              {editandoId === t.id ? (
                <div className="p-3 space-y-2 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-700">
                  <div className="flex gap-2">
                    <input value={editForm.emoji} onChange={e => setEditForm(f => ({ ...f, emoji: e.target.value }))}
                      className="w-10 text-center text-[16px] border border-slate-200 dark:border-slate-600 rounded px-1 py-1 bg-white dark:bg-slate-700 dark:text-white outline-none" maxLength={2} />
                    <input value={editForm.titulo} onChange={e => setEditForm(f => ({ ...f, titulo: e.target.value }))}
                      placeholder="Título" className="flex-1 text-[12px] border border-slate-200 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 dark:text-white outline-none focus:border-purple-400" />
                  </div>
                  <textarea value={editForm.instrucao} onChange={e => setEditForm(f => ({ ...f, instrucao: e.target.value }))}
                    placeholder="Instrução para a IA (tom e objetivo do Recriar)" rows={2}
                    className="w-full text-[11px] border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 bg-white dark:bg-slate-700 dark:text-white outline-none resize-none focus:border-purple-400" />
                  <div className="flex gap-2">
                    <button onClick={confirmarEdicao} className="px-3 py-1 bg-purple-600 text-white rounded text-[11px] hover:bg-purple-700">Salvar</button>
                    <button onClick={() => setEditandoId(null)} className="px-3 py-1 bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded text-[11px]">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-[16px]">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{t.titulo}</p>
                      <span className="text-[9px] text-slate-400 border border-slate-200 dark:border-slate-600 px-1 py-0.5 rounded-full">#{tIdx + 1}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{t.instrucao}</p>
                  </div>
                  <button onClick={() => iniciarEdicao(t)} className="p-1 text-slate-400 hover:text-blue-500 shrink-0"><Edit2 size={11} /></button>
                  <button onClick={() => excluirTemplate(t.id)} disabled={templates.length <= 1} className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-30 shrink-0"><Trash2 size={11} /></button>
                </div>
              )}

              {/* Frases individuais */}
              <div className="p-2.5 space-y-1.5">
                {(t.frases ?? []).map((frase, fIdx) => (
                  <FraseItem
                    key={fIdx}
                    frase={frase}
                    onSave={novo => salvarFrase(t.id, fIdx, novo)}
                    onDelete={() => excluirFrase(t.id, fIdx)}
                    canDelete={(t.frases?.length ?? 0) > 1}
                  />
                ))}
                {/* Adicionar frase */}
                <div className="flex items-center gap-1 pt-0.5">
                  <input
                    value={novaFrase[t.id] ?? ''}
                    onChange={e => setNovaFrase(prev => ({ ...prev, [t.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && adicionarFrase(t.id)}
                    placeholder="+ nova frase fixa..."
                    className="flex-1 text-[11px] border border-dashed border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-transparent dark:text-white outline-none focus:border-purple-400 placeholder:text-slate-300"
                  />
                  {(novaFrase[t.id] ?? '').trim() && (
                    <button onClick={() => adicionarFrase(t.id)} className="px-2 py-1 bg-purple-600 text-white rounded text-[10px] hover:bg-purple-700 shrink-0">
                      <Plus size={10} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Adicionar novo template */}
          {novoAberto ? (
            <div className="border border-dashed border-purple-300 dark:border-purple-600 rounded-[6px] p-3 space-y-2 bg-purple-50 dark:bg-purple-900/10">
              <p className="text-[11px] font-semibold text-purple-600">Novo modelo</p>
              <div className="flex gap-2">
                <input value={novoForm.emoji} onChange={e => setNovoForm(f => ({ ...f, emoji: e.target.value }))}
                  className="w-10 text-center text-[16px] border border-slate-200 dark:border-slate-600 rounded px-1 py-1 bg-white dark:bg-slate-700 dark:text-white outline-none" maxLength={2} />
                <input value={novoForm.titulo} onChange={e => setNovoForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Título do modelo" autoFocus
                  className="flex-1 text-[12px] border border-slate-200 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 dark:text-white outline-none focus:border-purple-400" />
              </div>
              <textarea value={novoForm.instrucao} onChange={e => setNovoForm(f => ({ ...f, instrucao: e.target.value }))}
                placeholder="Instrução para a IA ao usar Recriar" rows={2}
                className="w-full text-[11px] border border-slate-200 dark:border-slate-600 rounded px-2 py-1.5 bg-white dark:bg-slate-700 dark:text-white outline-none resize-none focus:border-purple-400" />
              <div className="flex gap-2">
                <button onClick={adicionarTemplate} className="px-3 py-1 bg-purple-600 text-white rounded text-[11px] hover:bg-purple-700">Adicionar</button>
                <button onClick={() => setNovoAberto(false)} className="px-3 py-1 bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded text-[11px]">Cancelar</button>
              </div>
            </div>
          ) : (
            <button onClick={() => { setNovoAberto(true); setEditandoId(null) }}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-slate-300 dark:border-slate-600 rounded-[6px] text-[11px] text-slate-400 hover:border-purple-400 hover:text-purple-500 transition-colors">
              <Plus size={12} /> Adicionar modelo
            </button>
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 shrink-0">
          <span className="font-medium text-indigo-500">Recriar</span> usa a instrução da IA (lê a conversa) ·{' '}
          <span className="font-medium text-purple-500">Trocar estilo</span> usa as frases fixas diretamente (sem IA)
        </div>
      </div>
    </div>
  )
}

// ─── ConversaPanel: painel lateral com histórico de mensagens ────────────────
const PAINEL_POLL_MS = 10_000

function ConversaPanel({ followup, onClose, rowProps, navigate, reloadTick }) {
  const [mensagens, setMensagens] = useState([])
  const [followups, setFollowups] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const bottomRef = useRef(null)
  const isFirstLoad = useRef(true)

  const conv = followup?.ci_conversas
  const nome = conv?.contato_nome || conv?.contato_numero || '—'
  const tempoBase = conv?.ultima_mensagem_lead_at ?? conv?.ultima_mensagem_at
  const tempo = calcTempo(tempoBase)

  async function fetchDados(showLoading = false) {
    if (!conv?.id) return
    if (showLoading) setLoading(true)
    const [{ data: msgs }, { data: fups }] = await Promise.all([
      supabase.from('ci_mensagens')
        .select('id, de, tipo, conteudo, transcricao, audio_url, enviado_at, is_auto')
        .eq('conversa_id', conv.id)
        .order('enviado_at', { ascending: true })
        .limit(100),
      supabase.from('ci_followups')
        .select('id, mensagem_sugerida, status, motivo, created_at, enviado_at')
        .eq('conversa_id', conv.id)
        .order('created_at', { ascending: true }),
    ])
    setMensagens(msgs ?? [])
    setFollowups(fups ?? [])
    setLastUpdate(new Date())
    if (showLoading) setLoading(false)
  }

  async function sincronizarConversa() {
    if (!conv || syncing) return
    setSyncing(true)
    await syncMensagensConversa(conv)
    await fetchDados(false)
    setSyncing(false)
  }

  // Carga inicial: sync + fetch ao abrir o painel
  useEffect(() => {
    if (!conv) return
    isFirstLoad.current = true
    setLoading(true)
    setSyncing(true)
    syncMensagensConversa(conv)
      .then(() => fetchDados(true))
      .finally(() => { isFirstLoad.current = false; setSyncing(false) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv?.id])

  // Recarrega silencioso quando reloadTick muda (ação do usuário)
  useEffect(() => {
    if (reloadTick > 0) fetchDados(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadTick])

  // Polling automático a cada 20s enquanto o painel está aberto
  useEffect(() => {
    if (!conv?.id) return
    const id = setInterval(() => fetchDados(false), PAINEL_POLL_MS)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: loading ? 'instant' : 'smooth' })
  }, [loading, mensagens.length])

  // Mescla mensagens + follow-ups enviados em ordem cronológica
  const timeline = useMemo(() => {
    const itens = [
      ...mensagens.map(m => ({ tipo: 'msg', ts: m.enviado_at, data: m })),
      ...followups
        .filter(f => f.status === 'enviado' && f.enviado_at)
        .map(f => ({ tipo: 'followup_enviado', ts: f.enviado_at, data: f })),
    ]
    return itens.sort((a, b) => new Date(a.ts) - new Date(b.ts))
  }, [mensagens, followups])

  const followupsPendentes = followups.filter(f => f.status === 'pendente')
  const followupsIgnorados = followups.filter(f => f.status === 'ignorado')

  function fmtHora(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <>
    {/* Overlay transparente — clique fora fecha o painel */}
    <div className="fixed inset-0 z-39" style={{ zIndex: 39 }} onClick={onClose} />
    <div className="fixed inset-y-0 right-0 z-40 flex flex-col bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 shadow-2xl"
      style={{ width: '420px' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 -ml-1">
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate">{nome}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] text-slate-400">{conv?.consultora ?? '—'}</span>
            {conv?.contato_numero && (
              <button
                onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(conv.contato_numero) }}
                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-500 transition-colors font-mono"
                title="Copiar número">
                <Copy size={9} /> {conv.contato_numero}
              </button>
            )}
            {tempo && !tempo.expirada && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${tempo.critica ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'}`}>
                {tempo.critica ? '⚠ ' : ''}{tempo.restante} restantes
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-slate-400">{mensagens.length} msgs</span>
          {followupsPendentes.length > 0 && (
            <span className="text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-full font-medium">
              {followupsPendentes.length} pendente
            </span>
          )}
          <button
            onClick={() => fetchDados(false)}
            title="Atualizar agora (auto: 10s)"
            className="flex items-center gap-0.5 text-[9px] text-slate-400 hover:text-blue-500 transition-colors">
            <RefreshCw size={9} className={loading ? 'animate-spin text-blue-400' : ''} />
            {lastUpdate && new Date(lastUpdate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </button>
          <button
            onClick={e => { e.stopPropagation(); sincronizarConversa() }}
            disabled={syncing}
            title="Sincronizar mensagens com DataCrazy"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-blue-500 hover:border-blue-300 disabled:opacity-50 transition-colors">
            {syncing ? <RefreshCw size={9} className="animate-spin" /> : <RefreshCw size={9} />}
            {syncing ? 'Sincronizando...' : 'Sync'}
          </button>
        </div>
      </div>

      {/* Corpo: mensagens */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw size={16} className="animate-spin text-slate-400" />
          </div>
        ) : timeline.length === 0 ? (
          <p className="text-center text-[12px] text-slate-400 mt-8">Nenhuma mensagem encontrada</p>
        ) : (
          timeline.map((item, idx) => {
            if (item.tipo === 'followup_enviado') {
              return (
                <div key={`fu-${item.data.id}`} className="flex justify-end">
                  <div className="max-w-[85%] bg-purple-600 text-white rounded-[10px] rounded-br-sm px-3 py-2">
                    <p className="text-[10px] font-semibold opacity-80 mb-1 flex items-center gap-1">
                      <Sparkles size={9} /> Follow-up IA enviado
                    </p>
                    <p className="text-[11px] leading-relaxed">{item.data.mensagem_sugerida}</p>
                    <p className="text-[9px] opacity-60 mt-1 text-right">{fmtHora(item.ts)}</p>
                  </div>
                </div>
              )
            }

            const msg = item.data
            const isLead = msg.de === 'lead' || msg.de === 'contato'
            const isAudio = msg.tipo === 'audio'
            const texto = isAudio ? null : (msg.conteudo ?? '')
            if (!isAudio && !texto.trim()) return null

            return (
              <div key={`msg-${msg.id ?? idx}`} className={`flex ${isLead ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] rounded-[10px] px-3 py-2 ${
                  isLead
                    ? 'bg-slate-100 dark:bg-slate-700 rounded-bl-sm'
                    : msg.is_auto
                    ? 'bg-slate-200 dark:bg-slate-600 rounded-br-sm'
                    : 'bg-blue-500 text-white rounded-br-sm'
                }`}>
                  {!isLead && (
                    <p className={`text-[9px] font-semibold mb-0.5 ${msg.is_auto ? 'text-slate-500' : 'text-blue-100'}`}>
                      {msg.is_auto ? 'Auto' : (conv?.consultora ?? 'Consultora')}
                    </p>
                  )}
                  {isAudio ? (
                    <div className="space-y-1.5">
                      {msg.audio_url && (
                        <audio controls src={msg.audio_url} className="w-full h-7" style={{ minWidth: '200px' }} />
                      )}
                      {msg.transcricao ? (
                        <p className={`text-[11px] leading-relaxed italic ${isLead ? 'text-slate-500 dark:text-slate-400' : msg.is_auto ? 'text-slate-500' : 'text-blue-100 opacity-90'}`}>
                          {msg.transcricao}
                        </p>
                      ) : (
                        <p className={`text-[10px] ${isLead ? 'text-slate-400' : 'text-blue-200 opacity-70'}`}>
                          [sem transcrição]
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className={`text-[11px] leading-relaxed ${isLead ? 'text-slate-700 dark:text-slate-200' : msg.is_auto ? 'text-slate-600 dark:text-slate-200' : 'text-white'}`}>
                      {texto}
                    </p>
                  )}
                  <p className={`text-[9px] mt-1 ${isLead ? 'text-slate-400' : msg.is_auto ? 'text-slate-400' : 'text-blue-100'} text-right`}>
                    {fmtHora(msg.enviado_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Footer: ações do follow-up */}
      {!loading && (
        <div className="border-t border-slate-200 dark:border-slate-700 shrink-0 bg-slate-50 dark:bg-slate-800/80">
          {(() => {
            if (followupsPendentes.length === 0) return null
            // Mostra apenas o mais recente; os demais ficam em aviso de limpeza
            const mais_recente = followupsPendentes[followupsPendentes.length - 1]
            const antigos = followupsPendentes.slice(0, -1)
            const f = mais_recente
            const fComConv = { ...f, ci_conversas: conv }
            const isEditando = rowProps?.editandoId === f.id
            const isEnviando = rowProps?.enviandoId === f.id
            const isRecriando = rowProps?.recriandoId === f.id
            const isTrocando = rowProps?.trocandoId === f.id
            const tmpl = rowProps?.templateAtual?.[f.id]
            return (
              <div className="px-3 py-2.5 space-y-2">
                {/* Aviso de duplicatas acumuladas */}
                {antigos.length > 0 && (
                  <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded px-2.5 py-1.5">
                    <p className="text-[10px] text-amber-600 dark:text-amber-400">
                      {antigos.length} sugestão(ões) antiga(s) acumulada(s)
                    </p>
                    <button
                      onClick={async () => {
                        for (const a of antigos) await rowProps?.onMarcar(a.id, 'ignorado')
                      }}
                      className="text-[10px] text-amber-600 dark:text-amber-400 hover:text-amber-800 font-medium underline ml-2 shrink-0">
                      Ignorar todas
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-semibold text-purple-500 uppercase flex items-center gap-1">
                    <Clock size={8} /> Sugestão pendente
                  </p>
                  {tmpl && (
                    <span className="text-[9px] bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-full font-medium">
                      {tmpl.emoji} {tmpl.titulo}
                    </span>
                  )}
                </div>
                {isEditando ? (
                  <textarea
                    autoFocus
                    value={rowProps.editTexto}
                    onChange={e => rowProps.setEditTexto(e.target.value)}
                    rows={3}
                    className="w-full text-[11px] bg-white dark:bg-slate-700 border border-purple-300 dark:border-purple-600 rounded px-2 py-1.5 outline-none resize-none text-slate-700 dark:text-slate-200 focus:border-purple-400"
                  />
                ) : (
                  <div className="bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded px-2.5 py-2 text-[11px] text-purple-700 dark:text-purple-300 italic leading-relaxed">
                    "{f.mensagem_sugerida}"
                  </div>
                )}
                {/* Botões de ação */}
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => rowProps?.onRecriar(fComConv)} disabled={isRecriando}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 rounded text-[11px] hover:bg-indigo-100 disabled:opacity-50 transition-colors">
                    {isRecriando ? <><RefreshCw size={9} className="animate-spin" /> Gerando...</> : <><ChevronRight size={9} /> Recriar</>}
                  </button>
                  <button onClick={() => rowProps?.onTrocarEstilo(fComConv)} disabled={isTrocando}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700 text-violet-600 dark:text-violet-400 rounded text-[11px] hover:bg-violet-100 disabled:opacity-50 transition-colors">
                    {isTrocando ? <><RefreshCw size={9} className="animate-spin" /></> : <><Shuffle size={9} /> Trocar estilo</>}
                  </button>
                  {!isEditando && (
                    <button onClick={() => rowProps?.onIniciarEdicao(fComConv)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[11px] text-slate-500 hover:text-blue-500 hover:border-blue-300 transition-colors">
                      <Edit2 size={9} /> Editar
                    </button>
                  )}
                  {isEditando && (
                    <button onClick={() => rowProps?.onSalvarEdicao(f.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-300 rounded text-[11px] text-blue-600 hover:bg-blue-100 transition-colors">
                      Salvar
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => rowProps?.onEnviar(fComConv)} disabled={isEnviando}
                    className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded text-[11px] hover:bg-purple-700 disabled:opacity-50 transition-colors flex-1 justify-center">
                    {isEnviando ? <><RefreshCw size={9} className="animate-spin" /> Enviando...</> : <><Send size={9} /> Enviar</>}
                  </button>
                  <button onClick={() => rowProps?.onMarcar(f.id, 'ignorado')}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300 rounded text-[11px] hover:bg-slate-200 transition-colors">
                    Ignorar
                  </button>
                  <button onClick={() => navigate?.(`/inbox?id=${conv?.id}`)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors">
                    <Eye size={9} /> Inbox
                  </button>
                </div>
              </div>
            )
          })()}
          {followupsPendentes.length === 0 && followupsIgnorados.length > 0 && (
            <div className="px-3 py-2.5">
              <p className="text-[10px] text-slate-400">{followupsIgnorados.length} follow-up(s) ignorado(s)</p>
            </div>
          )}
          {followupsPendentes.length === 0 && followupsIgnorados.length === 0 && followups.length === 0 && (
            <div className="px-3 py-2.5 flex items-center gap-2">
              <button onClick={() => navigate?.(`/inbox?id=${conv?.id}`)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors">
                <Eye size={9} /> Ver no Inbox
              </button>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  )
}

// ─── Row (fora do FollowUp para não remontar ao digitar) ─────────────────────
function Row({ f, editandoId, editTexto, setEditTexto, enviandoId, recriandoId, trocandoId, templateAtual,
  onIniciarEdicao, onSalvarEdicao, onEnviar, onMarcar, onCopiar, onVer, onRecriar, onTrocarEstilo, onAbrirPainel, painelAberto }) {
  const conv = f.ci_conversas
  const nome = conv?.contato_nome || conv?.contato_numero || '—'
  const numero = conv?.contato_numero
  // Usa timestamp da última mensagem do lead (correta para janela 24h WhatsApp)
  // Fallback para ultima_mensagem_at em conversas ainda não re-sincronizadas
  const tempoBase = conv?.ultima_mensagem_lead_at ?? conv?.ultima_mensagem_at
  const tempo = calcTempo(tempoBase)
  const isEditando = editandoId === f.id
  const isPendente = f.status === 'pendente'
  const tmpl = templateAtual[f.id]

  return (
    <tr className={`border-b transition-colors align-top ${
      painelAberto
        ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700'
        : 'border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30'
    }`}>
      <td className="px-3 py-2.5 min-w-[160px]">
        <div className="flex items-center gap-1.5">
          <p className="text-[12px] font-medium text-slate-800 dark:text-slate-200">{nome}</p>
          <button
            onClick={() => onAbrirPainel(f)}
            title="Ver conversa"
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors shrink-0 ${
              painelAberto
                ? 'bg-purple-600 border-purple-600 text-white'
                : 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700 text-purple-500 hover:bg-purple-100'
            }`}
          >
            <MessageSquare size={9} /> {painelAberto ? 'Aberto' : 'Chat'}
          </button>
        </div>
        {numero && (
          <button onClick={() => onCopiar(numero)} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-500 transition-colors mt-0.5">
            <Copy size={9} /> {numero}
          </button>
        )}
        {tempo && isPendente && (
          <div className="mt-1.5 space-y-0.5">
            <div className="text-[10px] text-slate-400">Há {tempo.decorrido}</div>
            {tempo.critica ? (
              <div className="flex items-center gap-1 text-[10px] text-red-500 font-semibold"><AlertTriangle size={9} /> {tempo.restante} restantes</div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-amber-500 font-medium"><Clock size={9} /> {tempo.restante} restantes</div>
            )}
            <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full mt-1">
              <div className={`h-1 rounded-full transition-all ${tempo.critica ? 'bg-red-500' : 'bg-amber-400'}`}
                style={{ width: `${Math.max(0, Math.min(100, (tempo.restanteMs / JANELA_MS) * 100))}%` }} />
            </div>
          </div>
        )}
        {!isPendente && f.enviado_at && <p className="text-[10px] text-slate-400 mt-1">Enviado {fmt(f.enviado_at)}</p>}
      </td>
      <td className="px-3 py-2.5 text-[11px] text-slate-500 dark:text-slate-400 min-w-[90px]">{conv?.consultora ?? '—'}</td>
      <td className="px-3 py-2.5 min-w-[260px]">
        {tmpl && isPendente && (
          <div className="mb-1.5">
            <span className="text-[9px] bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-full font-medium">
              {tmpl.emoji} {tmpl.titulo}
            </span>
          </div>
        )}
        {(() => {
          const s = seqInfo(f.motivo)
          const corClasses = {
            yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600',
            orange: 'bg-orange-50 border-orange-200 text-orange-600',
            red: 'bg-red-50 border-red-200 text-red-600',
            blue: 'bg-blue-50 border-blue-200 text-blue-600',
            slate: 'bg-slate-50 border-slate-200 text-slate-400',
          }
          return (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium border ${corClasses[s.cor] ?? corClasses.slate}`}>
              {s.label}
            </span>
          )
        })()}
        {isEditando ? (
          <textarea autoFocus value={editTexto} onChange={e => setEditTexto(e.target.value)} rows={4}
            className="w-full text-[11px] bg-white dark:bg-slate-700 border border-purple-300 dark:border-purple-600 rounded px-2 py-1.5 outline-none resize-none text-slate-700 dark:text-slate-200 focus:border-purple-400" />
        ) : (
          <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded p-2 text-[11px] text-purple-700 dark:text-purple-300 italic leading-relaxed">
            "{f.mensagem_sugerida}"
          </div>
        )}
      </td>
      <td className="px-3 py-2.5">
        <StatusChip status={f.status} />
        {f.motivo && (
          <p className="text-[9px] text-slate-400 mt-0.5">{f.motivo === 'janela_critica' ? '⚠ Crítica' : f.motivo === 'janela_24h' ? 'Auto' : f.motivo}</p>
        )}
      </td>
      <td className="px-3 py-2.5 min-w-[180px]">
        <div className="flex flex-col gap-1.5">
          {/* Linha 1: Ver + Editar/Salvar */}
          <div className="flex items-center gap-1">
            <button onClick={() => onVer(conv?.id)}
              className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors">
              <Eye size={10} /> Ver
            </button>
            {isPendente && !isEditando && (
              <button onClick={() => onIniciarEdicao(f)}
                className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[11px] text-slate-500 hover:text-blue-500 hover:border-blue-300 transition-colors">
                <Edit2 size={10} /> Editar
              </button>
            )}
            {isEditando && (
              <button onClick={() => onSalvarEdicao(f.id)}
                className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-300 rounded text-[11px] text-blue-600 hover:bg-blue-100 transition-colors">
                Salvar
              </button>
            )}
          </div>
          {isPendente && (
            <>
              {/* Linha 2: Recriar (IA) + Trocar estilo (frases fixas) */}
              <div className="flex items-center gap-1">
                <button onClick={() => onRecriar(f)} disabled={recriandoId === f.id}
                  className="flex items-center gap-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 rounded text-[11px] hover:bg-indigo-100 disabled:opacity-50 transition-colors">
                  {recriandoId === f.id
                    ? <><RefreshCw size={9} className="animate-spin" /> Gerando...</>
                    : <><ChevronRight size={9} /> Recriar</>}
                </button>
                <button onClick={() => onTrocarEstilo(f)} disabled={trocandoId === f.id}
                  className="flex items-center gap-1 px-2 py-1 bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700 text-violet-600 dark:text-violet-400 rounded text-[11px] hover:bg-violet-100 disabled:opacity-50 transition-colors">
                  {trocandoId === f.id
                    ? <><RefreshCw size={9} className="animate-spin" /></>
                    : <><Shuffle size={9} /> Trocar estilo</>}
                </button>
              </div>
              {/* Linha 3: Enviar + Ignorar */}
              <div className="flex items-center gap-1">
                <button onClick={() => onEnviar(f)} disabled={enviandoId === f.id}
                  className="flex items-center gap-1 px-2 py-1 bg-purple-600 text-white rounded text-[11px] hover:bg-purple-700 disabled:opacity-50 transition-colors">
                  {enviandoId === f.id ? <><RefreshCw size={9} className="animate-spin" /> Enviando...</> : <><Send size={9} /> Enviar</>}
                </button>
                <button onClick={() => onMarcar(f.id, 'ignorado')}
                  className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300 rounded text-[11px] hover:bg-slate-200 transition-colors">
                  Ignorar
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

const TableHead = () => (
  <thead>
    <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
      <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Contato · Janela 24h</th>
      <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Consultora</th>
      <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Mensagem IA</th>
      <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Status</th>
      <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Ações</th>
    </tr>
  </thead>
)

// ─── seqInfo: retorna info de sequência baseado no motivo ────────────────────
function seqInfo(motivo) {
  if (motivo === 'recebeu_valor_seq1') return { num: 1, label: '1º · 💰', cor: 'yellow' }
  if (motivo === 'recebeu_valor_seq2') return { num: 2, label: '2º · 💰', cor: 'orange' }
  if (motivo === 'recebeu_valor_seq3') return { num: 3, label: '3º · 💰', cor: 'red' }
  if (motivo === 'followup_seq2') return { num: 2, label: '2º follow-up', cor: 'blue' }
  return { num: 1, label: '1º follow-up', cor: 'slate' }
}

// ─── FollowUp Page ────────────────────────────────────────────────────────────
export function FollowUp() {
  const toast = useToast()
  const navigate = useNavigate()
  const [followups, setFollowups] = useState([])
  const [loading, setLoading] = useState(true)
  const [processando, setProcessando] = useState(false)
  const [autoAtivo, setAutoAtivo] = useState(() => localStorage.getItem('conversia_followup_auto') === 'true')
  const [editandoId, setEditandoId] = useState(null)
  const [editTexto, setEditTexto] = useState('')
  const [enviandoId, setEnviandoId] = useState(null)
  const [recriandoId, setRecriandoId] = useState(null)
  const [trocandoId, setTrocandoId] = useState(null)
  const [templateAtual, setTemplateAtual] = useState({})
  const [painelFollowup, setPainelFollowup] = useState(null) // followup aberto no painel
  const cursorRef = useRef({})    // templateIdx por followup
  const fraseCursorRef = useRef({}) // fraseIdx por followup
  const [stats, setStats] = useState({ aberta: 0, critica: 0, semFollowUp: 0, enviados: 0 })
  const [ultimoProcessamento, setUltimoProcessamento] = useState(null)
  const [proximoProcessamento, setProximoProcessamento] = useState(null)
  const [filtroOrdem, setFiltroOrdem] = useState('mais_urgente')
  const [abaConsultora, setAbaConsultora] = useState('Todas')
  const [modalModelos, setModalModelos] = useState(false)
  const [painelReloadTick, setPainelReloadTick] = useState(0)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: fus }, { data: stAberta }, { data: stCritica }, { data: stSem }, { data: stEnv }] = await Promise.all([
      supabase
        .from('ci_followups')
        .select(`*, ci_conversas(contato_nome, contato_numero, consultora, janela_24h_status, classificacao_ia, datacrazy_id, id, ultima_mensagem_at, ultima_mensagem_lead_at, total_mensagens, recebeu_valor)`)
        .order('created_at', { ascending: false })
        .limit(300),
      supabase.from('ci_conversas').select('id', { count: 'exact', head: true }).eq('janela_24h_status', 'aberta'),
      supabase.from('ci_conversas').select('id', { count: 'exact', head: true }).eq('janela_24h_status', 'critica'),
      supabase.from('ci_conversas').select('id', { count: 'exact', head: true })
        .eq('janela_24h_status', 'expirada')
        .gte('ultima_mensagem_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
        .not('id', 'in', `(select conversa_id from ci_followups where status = 'enviado')`),
      supabase.from('ci_followups').select('id', { count: 'exact', head: true }).eq('status', 'enviado'),
    ])
    setFollowups(fus ?? [])
    setStats({ aberta: stAberta?.count ?? 0, critica: stCritica?.count ?? 0, semFollowUp: stSem?.count ?? 0, enviados: stEnv?.count ?? 0 })
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    async function rodar() {
      setProcessando(true)
      await processarFollowUpsAuto()
      await carregar()
      setUltimoProcessamento(new Date())
      setProximoProcessamento(new Date(Date.now() + INTERVALO_MS))
      setProcessando(false)
    }
    rodar()
    const id = setInterval(rodar, INTERVALO_MS)
    setProximoProcessamento(new Date(Date.now() + INTERVALO_MS))
    return () => clearInterval(id)
  }, [carregar])

  const consultoras = useMemo(() => {
    const nomes = [...new Set(followups.map(f => f.ci_conversas?.consultora).filter(Boolean).filter(c => c !== 'Sem atendente'))].sort()
    return ['Todas', ...nomes]
  }, [followups])

  function toggleAuto() {
    const novo = !autoAtivo
    setAutoAtivo(novo)
    localStorage.setItem('conversia_followup_auto', String(novo))
    toast.success(novo ? 'Envio automático ativado' : 'Envio automático pausado')
  }

  async function marcar(id, status) {
    await supabase.from('ci_followups').update({ status, ...(status === 'enviado' ? { enviado_at: new Date().toISOString() } : {}) }).eq('id', id)
    setFollowups(prev => prev.map(f => f.id === id ? { ...f, status } : f))
    setPainelReloadTick(t => t + 1)
    if (status === 'enviado') await carregar()
  }

  function iniciarEdicao(f) { setEditandoId(f.id); setEditTexto(f.mensagem_sugerida) }

  async function salvarEdicao(id) {
    await supabase.from('ci_followups').update({ mensagem_sugerida: editTexto }).eq('id', id)
    setFollowups(prev => prev.map(f => f.id === id ? { ...f, mensagem_sugerida: editTexto } : f))
    setEditandoId(null)
  }

  async function enviarDireto(f) {
    const conv = f.ci_conversas
    if (!conv?.datacrazy_id) { toast.error('Conversa sem ID DataCrazy'); return }
    setEnviandoId(f.id)
    try {
      const texto = editandoId === f.id ? editTexto : f.mensagem_sugerida
      await enviarMensagem(conv.datacrazy_id, texto)
      await marcar(f.id, 'enviado')
      toast.success('Follow-up enviado!')
      setEditandoId(null)
    } catch (err) { toast.error('Erro ao enviar: ' + err.message) }
    finally { setEnviandoId(null) }
  }

  async function recriarMensagem(f) {
    const conv = f.ci_conversas
    if (!conv) return
    setRecriandoId(f.id)
    try {
      const templates = getTemplates()
      const cursor = cursorRef.current[f.id] ?? 0
      const template = templates[cursor % templates.length]
      cursorRef.current[f.id] = (cursor + 1) % templates.length

      const { data: msgs } = await supabase.from('ci_mensagens')
        .select('de, tipo, conteudo, transcricao, enviado_at')
        .eq('conversa_id', conv.id)
        .order('enviado_at', { ascending: false }).limit(20)

      const mensagens = (msgs ?? []).reverse()
      const texto = await gerarMensagemFollowUp(conv, mensagens, template)
      if (!texto) { toast.error('Não foi possível gerar a mensagem'); return }

      await supabase.from('ci_followups').update({ mensagem_sugerida: texto }).eq('id', f.id)
      setFollowups(prev => prev.map(p => p.id === f.id ? { ...p, mensagem_sugerida: texto } : p))
      setTemplateAtual(prev => ({ ...prev, [f.id]: template }))
      if (editandoId === f.id) setEditTexto(texto)
      setPainelReloadTick(t => t + 1)
      toast.success(`Recriar: ${template.emoji} ${template.titulo}`)
    } catch (err) { toast.error('Erro ao recriar: ' + err.message) }
    finally { setRecriandoId(null) }
  }

  async function trocarEstilo(f) {
    setTrocandoId(f.id)
    try {
      const todasFrases = getAllFrases()
      if (!todasFrases.length) { toast.error('Nenhuma frase cadastrada nos modelos'); return }
      const cursor = fraseCursorRef.current[f.id] ?? 0
      const { frase, template } = todasFrases[cursor % todasFrases.length]
      fraseCursorRef.current[f.id] = (cursor + 1) % todasFrases.length

      await supabase.from('ci_followups').update({ mensagem_sugerida: frase }).eq('id', f.id)
      setFollowups(prev => prev.map(p => p.id === f.id ? { ...p, mensagem_sugerida: frase } : p))
      setTemplateAtual(prev => ({ ...prev, [f.id]: template }))
      if (editandoId === f.id) setEditTexto(frase)
      setPainelReloadTick(t => t + 1)
      toast.success(`${template.emoji} ${template.titulo}`)
    } catch (err) { toast.error('Erro: ' + err.message) }
    finally { setTrocandoId(null) }
  }

  function copiarNumero(numero) { navigator.clipboard.writeText(numero); toast.success('Número copiado') }
  function verConversa(id) { navigate(`/inbox?id=${id}`) }
  function abrirPainel(f) { setPainelFollowup(prev => prev?.id === f.id ? null : f) }

  const filtrarConsultora = (lista) =>
    abaConsultora === 'Todas' ? lista : lista.filter(f => f.ci_conversas?.consultora === abaConsultora)

  const pendentes = useMemo(() => {
    let lista = followups
      .filter(f => f.status === 'pendente')
      .filter(f => {
        const conv = f.ci_conversas
        const t = calcTempo(conv?.ultima_mensagem_lead_at ?? conv?.ultima_mensagem_at)
        return t && !t.expirada
      })

    if (filtroOrdem === 'primeira_msg') {
      lista = lista.filter(f => {
        const total = f.ci_conversas?.total_mensagens
        return total != null && total >= 1 && total <= 5
      })
    }

    lista.sort((a, b) => {
      const convA = a.ci_conversas; const convB = b.ci_conversas
      const tA = calcTempo(convA?.ultima_mensagem_lead_at ?? convA?.ultima_mensagem_at)?.restanteMs ?? Infinity
      const tB = calcTempo(convB?.ultima_mensagem_lead_at ?? convB?.ultima_mensagem_at)?.restanteMs ?? Infinity
      return filtroOrdem === 'menos_urgente' ? tB - tA : tA - tB
    })

    return filtrarConsultora(lista)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followups, filtroOrdem, abaConsultora])

  const pendentesValor = useMemo(() => pendentes.filter(f => f.ci_conversas?.recebeu_valor === true), [pendentes])
  const pendentesNormal = useMemo(() => pendentes.filter(f => f.ci_conversas?.recebeu_valor !== true), [pendentes])

  const historico = useMemo(() =>
    filtrarConsultora(followups.filter(f => f.status !== 'pendente'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  , [followups, abaConsultora])

  const rowProps = {
    editandoId, editTexto, setEditTexto, enviandoId, recriandoId, trocandoId, templateAtual,
    onIniciarEdicao: iniciarEdicao, onSalvarEdicao: salvarEdicao,
    onEnviar: enviarDireto, onMarcar: marcar,
    onCopiar: copiarNumero, onVer: verConversa,
    onRecriar: recriarMensagem, onTrocarEstilo: trocarEstilo,
    onAbrirPainel: abrirPainel,
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Follow-up IA" />
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900">

        <div className="flex gap-2">
          <StatCard label="Janela aberta" value={stats.aberta} cor="azul" sub="Leads ativos agora" />
          <StatCard label="Janela crítica" value={stats.critica} cor="laranja" sub="< 4h restantes" />
          <StatCard label="Pendentes" value={pendentes.length} cor="roxo" sub="Aguardando envio" />
          <StatCard label="Sem follow-up" value={stats.semFollowUp} cor="cinza" sub="Janela fechou sem ação" />
          <StatCard label="Enviados" value={stats.enviados} cor="verde" sub="Total histórico" />
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Envio automático</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {autoAtivo ? 'Mensagens geradas serão enviadas sem revisão' : 'Modo revisão — você aprova antes de enviar (recomendado para testes)'}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-[10px] text-slate-400 text-right">
              {processando && <span className="flex items-center gap-1 text-purple-500"><RefreshCw size={9} className="animate-spin" /> Gerando...</span>}
              {!processando && ultimoProcessamento && <span>Último: {ultimoProcessamento.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
              {proximoProcessamento && <span className="block">Próximo: {proximoProcessamento.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
            </div>
            <button onClick={() => setModalModelos(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700 text-[12px] text-slate-600 dark:text-slate-300 hover:border-purple-400 hover:text-purple-600 transition-colors">
              <Settings size={13} /> Modelos
            </button>
            <button onClick={toggleAuto}
              className={`flex items-center gap-2 px-3 py-2 rounded-[6px] border text-[12px] font-medium transition-colors ${autoAtivo ? 'bg-purple-600 border-purple-600 text-white hover:bg-purple-700' : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-500 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}>
              {autoAtivo ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
              {autoAtivo ? 'Automático' : 'Manual'}
            </button>
          </div>
        </div>

        {/* Tabs por consultora */}
        <div className="flex items-center gap-0.5 border-b border-slate-200 dark:border-slate-700">
          {consultoras.map(c => (
            <button key={c} onClick={() => setAbaConsultora(c)}
              className={`px-3 py-1.5 text-[11px] font-medium border-b-2 -mb-px transition-colors ${abaConsultora === c ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:border-slate-300'}`}>
              {c}
            </button>
          ))}
        </div>

        {/* Seção: Recebeu Valor (prioritária) */}
        {pendentesValor.length > 0 && (
          <div className="bg-white dark:bg-slate-800 border border-yellow-200 dark:border-yellow-800 rounded-[6px] overflow-hidden">
            <div className="px-3 py-2 border-b border-yellow-100 dark:border-yellow-800 flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20">
              <span className="text-[13px]">💰</span>
              <p className="text-[12px] font-semibold text-yellow-700 dark:text-yellow-400">
                {pendentesValor.length} leads que receberam o valor
              </p>
              <span className="text-[10px] text-yellow-500 ml-auto">Sequência prioritária · até 3 mensagens</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full"><TableHead />
                <tbody>{pendentesValor.map(f => <Row key={f.id} f={f} {...rowProps} painelAberto={painelFollowup?.id === f.id} />)}</tbody>
              </table>
            </div>
          </div>
        )}

        {/* Lista pendentes normais */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <Sparkles size={13} className="text-purple-500" />
              <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                {loading ? '…' : `${pendentesNormal.length} follow-ups pendentes`}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-1">
              {[{ key: 'mais_urgente', label: 'Mais urgente' }, { key: 'menos_urgente', label: 'Menos urgente' }, { key: 'primeira_msg', label: 'Só 1ª mensagem' }].map(({ key, label }) => (
                <button key={key} onClick={() => setFiltroOrdem(key)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${filtroOrdem === key ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-purple-300 hover:text-purple-500'}`}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={carregar} disabled={loading} className="text-[11px] text-slate-400 hover:text-blue-500 flex items-center gap-1 disabled:opacity-50 shrink-0">
              <RefreshCw size={10} className={loading ? 'animate-spin' : ''} /> Atualizar
            </button>
          </div>
          {loading ? (
            <p className="text-center text-[12px] text-slate-400 py-8">Carregando...</p>
          ) : pendentesNormal.length === 0 ? (
            <p className="text-center text-[12px] text-slate-400 py-8">Nenhum follow-up pendente 🎉</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full"><TableHead />
                <tbody>{pendentesNormal.map(f => <Row key={f.id} f={f} {...rowProps} painelAberto={painelFollowup?.id === f.id} />)}</tbody>
              </table>
            </div>
          )}
        </div>

        {historico.length > 0 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
              <CheckCircle size={12} className="text-green-500" />
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Histórico — {historico.filter(f => f.status === 'enviado').length} enviados · {historico.filter(f => f.status === 'ignorado').length} ignorados
              </p>
            </div>
            <div className="overflow-x-auto opacity-80">
              <table className="w-full"><TableHead />
                <tbody>{historico.map(f => <Row key={f.id} f={f} {...rowProps} painelAberto={painelFollowup?.id === f.id} />)}</tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {modalModelos && <TemplatesModal onClose={() => setModalModelos(false)} />}
      {painelFollowup && (
        <ConversaPanel
          followup={painelFollowup}
          onClose={() => setPainelFollowup(null)}
          rowProps={rowProps}
          navigate={navigate}
          reloadTick={painelReloadTick}
        />
      )}
    </div>
  )
}
