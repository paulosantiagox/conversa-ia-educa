import { Topbar } from '../../components/layout/Topbar'
import { ScoreBar } from '../../components/shared/ScoreBar'
import { useFunil } from '../../hooks/useFunil'
import { formatRelativeTime } from '../../lib/utils'

const ETAPA_CONFIG = {
  aberta: { label: 'Aberto', color: '#3b82f6', bg: 'bg-blue-50', border: 'border-blue-200' },
  negociando: { label: 'Negociando', color: '#8b5cf6', bg: 'bg-purple-50', border: 'border-purple-200' },
  recebeu_valor: { label: 'Recebeu Valor', color: '#f59e0b', bg: 'bg-amber-50', border: 'border-amber-200' },
  recebeu_link: { label: 'Recebeu Link', color: '#f97316', bg: 'bg-orange-50', border: 'border-orange-200' },
  vendido: { label: 'Vendido', color: '#22c55e', bg: 'bg-green-50', border: 'border-green-200' },
  perdido: { label: 'Perdido', color: '#374151', bg: 'bg-gray-100', border: 'border-gray-200' },
}

function FunilCard({ conversa }) {
  return (
    <div className="bg-white border border-slate-200 rounded p-2 mb-1.5 hover:border-slate-300 transition-colors">
      <p className="text-[12px] font-medium text-slate-800 truncate">{conversa.contato_nome}</p>
      <p className="text-[10px] text-slate-400 mb-1">{conversa.consultora} · {formatRelativeTime(conversa.ultima_mensagem_at)}</p>
      <ScoreBar score={conversa.score_ia} height={3} />
    </div>
  )
}

export function Funil() {
  const { funil, etapas } = useFunil()

  const total = etapas.reduce((sum, e) => sum + (funil[e]?.length || 0), 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Funil de Vendas" />
      <div className="shrink-0 flex items-center gap-4 px-4 py-2 bg-white border-b border-slate-200">
        {etapas.map((etapa, i) => {
          const cfg = ETAPA_CONFIG[etapa]
          const count = funil[etapa]?.length || 0
          const prev = i > 0 ? (funil[etapas[i - 1]]?.length || 0) : null
          const taxa = prev ? Math.round((count / prev) * 100) : null
          return (
            <div key={etapa} className="flex items-center gap-2">
              {i > 0 && <span className="text-slate-300">›</span>}
              <div className="text-center">
                <p className="text-[10px] text-slate-500">{cfg.label}</p>
                <p className="text-[18px] font-bold" style={{ color: cfg.color }}>{count}</p>
                {taxa !== null && (
                  <p className="text-[10px] text-slate-400">→ {taxa}%</p>
                )}
              </div>
            </div>
          )
        })}
        <div className="ml-auto text-[11px] text-slate-400">Total: {total} conversas</div>
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex gap-3 h-full min-w-max">
          {etapas.map(etapa => {
            const cfg = ETAPA_CONFIG[etapa]
            const cards = funil[etapa] || []
            return (
              <div key={etapa} className="w-[180px] shrink-0 flex flex-col">
                <div
                  className={`flex items-center justify-between px-2 py-1.5 rounded-t border ${cfg.border} ${cfg.bg}`}
                >
                  <span className="text-[11px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                  <span className="text-[11px] font-bold" style={{ color: cfg.color }}>{cards.length}</span>
                </div>
                <div className={`flex-1 overflow-y-auto p-1.5 border border-t-0 ${cfg.border} rounded-b bg-slate-50`}>
                  {cards.map(c => <FunilCard key={c.id} conversa={c} />)}
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
  )
}
