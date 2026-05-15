import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { StatusBadge } from './StatusBadge'
import { ScoreBar } from './ScoreBar'
import { getInitials, truncate, formatRelativeTime } from '../../lib/utils'

export function ConversaItem({ conversa, selected, onClick }) {
  const initials = getInitials(conversa.contato_nome)
  const ultimaMsgTooltip = conversa.ultima_mensagem_at
    ? format(new Date(conversa.ultima_mensagem_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : null
  const bgColors = {
    quente: 'bg-red-500',
    morno: 'bg-amber-500',
    frio: 'bg-slate-400',
    vendido: 'bg-green-500',
    perdido: 'bg-gray-500',
    aberta: 'bg-blue-500',
  }
  const bg = bgColors[conversa.classificacao_ia] || 'bg-slate-400'

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors relative ${selected ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-l-blue-500' : ''}`}
    >
      <div className="flex items-start gap-2">
        <div className={`shrink-0 w-7 h-7 rounded-full ${bg} flex items-center justify-center text-white text-[10px] font-bold mt-0.5`}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[12px] font-medium text-slate-800 dark:text-slate-200 truncate">{conversa.contato_nome}</span>
            <span
              className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0"
              title={ultimaMsgTooltip ?? undefined}
            >
              {formatRelativeTime(conversa.ultima_mensagem_at)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusBadge status={conversa.status} size="xs" />
            <span className="text-[10px] text-slate-400 dark:text-slate-500">{conversa.consultora}</span>
          </div>
          <ScoreBar score={conversa.score_ia} height={3} />
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{conversa.ultima_mensagem_texto}</p>
          {conversa.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {conversa.tags.includes('recebeu_valor') && (
                <span className="text-[10px] bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1 rounded">💰 Valor</span>
              )}
              {conversa.tags.includes('recebeu_link') && (
                <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1 rounded">🔗 Link</span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
