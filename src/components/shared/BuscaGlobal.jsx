import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, MessageSquare, Flame, Bell } from 'lucide-react'
import { CONVERSAS, ALERTAS } from '../../lib/mockData'
import { StatusBadge } from './StatusBadge'

function highlight(text, termo) {
  if (!termo || !text) return text
  const idx = String(text).toLowerCase().indexOf(termo.toLowerCase())
  if (idx === -1) return text
  const str = String(text)
  return (
    <>
      {str.slice(0, idx)}
      <strong className="font-semibold text-slate-900 dark:text-white">{str.slice(idx, idx + termo.length)}</strong>
      {str.slice(idx + termo.length)}
    </>
  )
}

function buscarDados(termo) {
  if (!termo || termo.length < 2) return { conversas: [], leads: [], alertas: [] }
  const t = termo.toLowerCase()

  const conversas = CONVERSAS.filter(c =>
    c.contato_nome?.toLowerCase().includes(t) ||
    c.contato_numero?.toLowerCase().includes(t) ||
    c.consultora?.toLowerCase().includes(t) ||
    c.ultima_mensagem_texto?.toLowerCase().includes(t)
  ).slice(0, 5)

  const leads = CONVERSAS.filter(c =>
    (c.classificacao_ia === 'quente' || (c.score_ia ?? 0) >= 70) && (
      c.contato_nome?.toLowerCase().includes(t) ||
      c.contato_numero?.toLowerCase().includes(t) ||
      c.consultora?.toLowerCase().includes(t)
    )
  ).slice(0, 5)

  const alertas = ALERTAS.filter(a =>
    a.descricao?.toLowerCase().includes(t) ||
    a.contato_nome?.toLowerCase().includes(t) ||
    a.consultora?.toLowerCase().includes(t)
  ).slice(0, 5)

  return { conversas, leads, alertas }
}

function ResultGroup({ title, icon: Icon, items, termo, renderItem }) {
  if (items.length === 0) return null
  return (
    <div className="mb-1">
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50">
        <Icon size={11} className="text-slate-400" />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{title}</span>
        <span className="text-[10px] text-slate-300 dark:text-slate-600">({items.length})</span>
      </div>
      {items.map(item => renderItem(item, termo))}
    </div>
  )
}

export function BuscaGlobal({ aberto, onFechar }) {
  const [termo, setTermo] = useState('')
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const resultados = buscarDados(termo)
  const temResultados = resultados.conversas.length + resultados.leads.length + resultados.alertas.length > 0

  useEffect(() => {
    if (aberto) {
      setTermo('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [aberto])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onFechar()
    }
    if (aberto) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aberto, onFechar])

  const navegar = useCallback((rota) => {
    navigate(rota)
    onFechar()
  }, [navigate, onFechar])

  if (!aberto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onFechar}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-[560px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[8px] shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 dark:border-slate-700">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={termo}
            onChange={e => setTermo(e.target.value)}
            placeholder="Buscar conversas, leads, alertas..."
            className="flex-1 text-[13px] bg-transparent outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
          />
          {termo && (
            <button onClick={() => setTermo('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <X size={13} />
            </button>
          )}
          <kbd className="text-[10px] text-slate-400 border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5">Esc</kbd>
        </div>

        {/* Resultados */}
        <div className="max-h-[420px] overflow-y-auto">
          {!termo || termo.length < 2 ? (
            <p className="text-center text-[12px] text-slate-400 py-8">Digite pelo menos 2 caracteres</p>
          ) : !temResultados ? (
            <p className="text-center text-[12px] text-slate-400 py-8">Nenhum resultado para "{termo}"</p>
          ) : (
            <>
              <ResultGroup
                title="Conversas"
                icon={MessageSquare}
                items={resultados.conversas}
                termo={termo}
                renderItem={(c, t) => (
                  <button
                    key={c.id}
                    onClick={() => navegar('/inbox')}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                      {c.contato_nome?.[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-slate-700 dark:text-slate-200 truncate">
                        {highlight(c.contato_nome, t)}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {highlight(c.consultora, t)} · {highlight(c.ultima_mensagem_texto, t)}
                      </p>
                    </div>
                    <StatusBadge status={c.status} size="xs" />
                  </button>
                )}
              />
              <ResultGroup
                title="Leads Quentes"
                icon={Flame}
                items={resultados.leads}
                termo={termo}
                renderItem={(c, t) => (
                  <button
                    key={c.id}
                    onClick={() => navegar('/leads-quentes')}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                      {c.contato_nome?.[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-slate-700 dark:text-slate-200 truncate">
                        {highlight(c.contato_nome, t)}
                      </p>
                      <p className="text-[11px] text-slate-400">Score: {c.score_ia} · {highlight(c.consultora, t)}</p>
                    </div>
                    <span className="text-[11px] font-semibold text-green-600">{c.chance_fechamento}%</span>
                  </button>
                )}
              />
              <ResultGroup
                title="Alertas"
                icon={Bell}
                items={resultados.alertas}
                termo={termo}
                renderItem={(a, t) => (
                  <button
                    key={a.id}
                    onClick={() => navegar('/alertas')}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                      <Bell size={13} className="text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-slate-700 dark:text-slate-200 truncate">
                        {highlight(a.descricao, t)}
                      </p>
                      <p className="text-[11px] text-slate-400">{highlight(a.contato_nome, t)} · {highlight(a.consultora, t)}</p>
                    </div>
                  </button>
                )}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 dark:border-slate-700 px-3 py-1.5 flex items-center gap-3">
          <span className="text-[10px] text-slate-400"><kbd className="border border-slate-200 dark:border-slate-600 rounded px-1">↵</kbd> abrir</span>
          <span className="text-[10px] text-slate-400"><kbd className="border border-slate-200 dark:border-slate-600 rounded px-1">Esc</kbd> fechar</span>
        </div>
      </div>
    </div>
  )
}
