import { StatusBadge } from './StatusBadge'
import { ScoreBar } from './ScoreBar'
import { getInitials, truncate, formatRelativeTime } from '../../lib/utils'

export function ConversaItem({ conversa, selected, onClick }) {
  const initials = getInitials(conversa.contato_nome)
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
      className={`w-full text-left px-3 py-2.5 border-b border-slate-100 hover:bg-slate-50 transition-colors relative ${selected ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
    >
      <div className="flex items-start gap-2">
        <div className={`shrink-0 w-8 h-8 rounded-full ${bg} flex items-center justify-center text-white text-[11px] font-bold`}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-[12px] font-semibold text-slate-800 truncate">{conversa.contato_nome}</span>
            <span className="text-[10px] text-slate-400 shrink-0">{formatRelativeTime(conversa.ultima_mensagem_at)}</span>
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            <StatusBadge status={conversa.status} size="xs" />
            <span className="text-[10px] text-slate-400">{conversa.consultora}</span>
          </div>
          <ScoreBar score={conversa.score_ia} height={3} />
          <p className="text-[11px] text-slate-500 truncate mt-1">{conversa.ultima_mensagem_texto}</p>
          {conversa.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {conversa.tags.includes('recebeu_valor') && (
                <span className="text-[10px] bg-green-50 text-green-600 px-1 rounded">💰 Valor</span>
              )}
              {conversa.tags.includes('recebeu_link') && (
                <span className="text-[10px] bg-blue-50 text-blue-600 px-1 rounded">🔗 Link</span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
