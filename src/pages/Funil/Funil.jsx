import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useNavigate } from 'react-router-dom'
import { X, ExternalLink } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { ScoreBar } from '../../components/shared/ScoreBar'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { useFunil } from '../../hooks/useFunil'
import { formatRelativeTime } from '../../lib/utils'
import { getScoreColor } from '../../lib/utils'

const ETAPA_CONFIG = {
  aberta: { label: 'Aberto', color: '#3b82f6', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', headerText: 'text-blue-600 dark:text-blue-400' },
  negociando: { label: 'Negociando', color: '#8b5cf6', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', headerText: 'text-purple-600 dark:text-purple-400' },
  recebeu_valor: { label: 'Recebeu Valor', color: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', headerText: 'text-amber-600 dark:text-amber-400' },
  recebeu_link: { label: 'Recebeu Link', color: '#f97316', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', headerText: 'text-orange-600 dark:text-orange-400' },
  vendido: { label: 'Vendido', color: '#22c55e', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', headerText: 'text-green-600 dark:text-green-400' },
  perdido: { label: 'Perdido', color: '#374151', bg: 'bg-gray-100 dark:bg-gray-800/50', border: 'border-gray-200 dark:border-gray-700', headerText: 'text-gray-600 dark:text-gray-400' },
}

const MOCK_MSGS = [
  { id: 1, de: 'lead', conteudo: 'Oi, vi o anúncio e quero saber mais sobre o curso' },
  { id: 2, de: 'consultora', conteudo: 'Olá! Que ótimo que você entrou em contato. O EJA Educa Brasil é o maior programa de certificação para adultos do país.' },
  { id: 3, de: 'lead', conteudo: 'Quanto custa?' },
]

function DrawerFunil({ conversa, onClose }) {
  const navigate = useNavigate()
  const scoreColor = getScoreColor(conversa?.score_ia ?? 0)
  const msgs = MOCK_MSGS

  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <Dialog.Content
        className="fixed top-0 right-0 z-50 h-full w-[420px] bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col shadow-xl focus:outline-none"
        onEscapeKeyDown={onClose}
        onInteractOutside={onClose}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <div>
            <Dialog.Title asChild>
              <p className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">{conversa.contato_nome}</p>
            </Dialog.Title>
            <p className="text-[11px] text-slate-400">{conversa.contato_numero}</p>
          </div>
          <Dialog.Close asChild>
            <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
              <X size={15} />
            </button>
          </Dialog.Close>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Info básica */}
          <div className="flex items-center gap-3">
            <StatusBadge status={conversa.status} />
            <span className="text-[12px] text-slate-500 dark:text-slate-400">Consultora: <strong className="text-slate-700 dark:text-slate-200">{conversa.consultora}</strong></span>
            <span className="text-[11px] text-slate-400">{formatRelativeTime(conversa.ultima_mensagem_at)}</span>
          </div>

          {/* Score */}
          <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-[6px] p-3">
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Score IA</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold tabular-nums" style={{ color: scoreColor }}>{conversa.score_ia}</span>
              <div className="flex-1">
                <ScoreBar score={conversa.score_ia} height={6} />
                <p className="text-[10px] text-slate-400 mt-1">Chance de fechar: <strong style={{ color: scoreColor }}>{conversa.chance_fechamento}%</strong></p>
              </div>
            </div>
          </div>

          {/* Últimas mensagens */}
          <div>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Últimas mensagens</p>
            <div className="space-y-2">
              {msgs.map(m => (
                <div key={m.id} className={`flex ${m.de === 'lead' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] px-2.5 py-1.5 rounded text-[12px] ${
                    m.de === 'lead'
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      : 'bg-blue-900 text-white'
                  }`}>
                    {m.conteudo}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumo IA */}
          {conversa.resumo_ia && (
            <div>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Resumo IA</p>
              <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">{conversa.resumo_ia}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 p-3">
          <button
            onClick={() => { navigate('/inbox'); onClose() }}
            className="w-full flex items-center justify-center gap-2 py-2 bg-slate-900 dark:bg-slate-600 text-white text-[12px] font-medium rounded-[6px] hover:bg-slate-800 dark:hover:bg-slate-500 transition-colors"
          >
            <ExternalLink size={13} /> Ver conversa completa
          </button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  )
}

function FunilCard({ conversa, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded p-2 mb-1.5 hover:border-slate-400 dark:hover:border-slate-400 hover:shadow-sm transition-all"
    >
      <p className="text-[12px] font-medium text-slate-800 dark:text-slate-200 truncate">{conversa.contato_nome}</p>
      <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1">{conversa.consultora} · {formatRelativeTime(conversa.ultima_mensagem_at)}</p>
      <ScoreBar score={conversa.score_ia} height={3} />
    </button>
  )
}

export function Funil() {
  const { funil, etapas } = useFunil()
  const [selecionada, setSelecionada] = useState(null)
  const total = etapas.reduce((sum, e) => sum + (funil[e]?.length || 0), 0)

  return (
    <Dialog.Root open={!!selecionada} onOpenChange={open => { if (!open) setSelecionada(null) }}>
      <div className="flex flex-col h-full overflow-hidden">
        <Topbar title="Funil de Vendas" />
        <div className="shrink-0 flex items-center gap-4 px-4 py-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          {etapas.map((etapa, i) => {
            const cfg = ETAPA_CONFIG[etapa]
            const count = funil[etapa]?.length || 0
            const prev = i > 0 ? (funil[etapas[i - 1]]?.length || 0) : null
            const taxa = prev ? Math.round((count / prev) * 100) : null
            return (
              <div key={etapa} className="flex items-center gap-2">
                {i > 0 && <span className="text-slate-300 dark:text-slate-600">›</span>}
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{cfg.label}</p>
                  <p className="text-[18px] font-bold" style={{ color: cfg.color }}>{count}</p>
                  {taxa !== null && <p className="text-[10px] text-slate-400">→ {taxa}%</p>}
                </div>
              </div>
            )
          })}
          <div className="ml-auto text-[11px] text-slate-400">Total: {total} conversas</div>
        </div>
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 bg-slate-50 dark:bg-slate-900">
          <div className="flex gap-3 h-full min-w-max">
            {etapas.map(etapa => {
              const cfg = ETAPA_CONFIG[etapa]
              const cards = funil[etapa] || []
              return (
                <div key={etapa} className="w-[180px] shrink-0 flex flex-col">
                  <div className={`flex items-center justify-between px-2 py-1.5 rounded-t border ${cfg.border} ${cfg.bg}`}>
                    <span className={`text-[11px] font-semibold ${cfg.headerText}`}>{cfg.label}</span>
                    <span className={`text-[11px] font-bold ${cfg.headerText}`}>{cards.length}</span>
                  </div>
                  <div className={`flex-1 overflow-y-auto p-1.5 border border-t-0 ${cfg.border} rounded-b bg-slate-50 dark:bg-slate-800/50`}>
                    {cards.map(c => (
                      <Dialog.Trigger asChild key={c.id}>
                        <FunilCard conversa={c} onClick={() => setSelecionada(c)} />
                      </Dialog.Trigger>
                    ))}
                    {cards.length === 0 && (
                      <p className="text-[11px] text-slate-400 text-center mt-4">Vazio</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {selecionada && <DrawerFunil conversa={selecionada} onClose={() => setSelecionada(null)} />}
    </Dialog.Root>
  )
}
