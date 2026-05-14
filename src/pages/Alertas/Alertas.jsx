import { useState } from 'react'
import { Bell, Eye, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Topbar } from '../../components/layout/Topbar'
import { ALERTAS } from '../../lib/mockData'
import { formatRelativeTime } from '../../lib/utils'

const SEV_CONFIG = {
  critica: { label: '🔴 Crítico', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
  atencao: { label: '🟠 Atenção', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500' },
  aviso: { label: '🟡 Aviso', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-400' },
}

export function Alertas() {
  const [alertas, setAlertas] = useState(ALERTAS)
  const navigate = useNavigate()

  const naoLidos = alertas.filter(a => !a.lido)
  const lidos = alertas.filter(a => a.lido)

  function marcarLido(id) {
    setAlertas(prev => prev.map(a => a.id === id ? { ...a, lido: true } : a))
  }

  function AlCol({ list }) {
    return list.map(a => {
      const cfg = SEV_CONFIG[a.severidade] || SEV_CONFIG.aviso
      return (
        <div key={a.id} className={`flex items-start gap-3 p-3 border rounded-[6px] mb-2 ${cfg.bg} ${cfg.border} ${a.lido ? 'opacity-50' : ''}`}>
          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-[11px] font-semibold ${cfg.text}`}>{cfg.label}</span>
              <span className="text-[10px] text-slate-400">{formatRelativeTime(a.created_at)}</span>
            </div>
            <p className="text-[12px] text-slate-700">{a.descricao}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {a.contato_nome} · {a.consultora}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => navigate('/inbox')}
              className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Eye size={10} /> Ver
            </button>
            {!a.lido && (
              <button
                onClick={() => marcarLido(a.id)}
                className="flex items-center gap-1 px-2 py-1 bg-slate-800 text-white rounded text-[11px] hover:bg-slate-700 transition-colors"
              >
                <Check size={10} /> Lido
              </button>
            )}
          </div>
        </div>
      )
    })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Central de Alertas" />
      <div className="flex-1 overflow-y-auto p-4">
        {naoLidos.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Bell size={13} className="text-red-500" />
              <p className="text-[12px] font-semibold text-slate-700">{naoLidos.length} alertas pendentes</p>
            </div>
            <AlCol list={naoLidos} />
          </div>
        )}
        {lidos.length > 0 && (
          <div>
            <p className="text-[11px] text-slate-400 font-medium mb-2 uppercase tracking-wide">Resolvidos</p>
            <AlCol list={lidos} />
          </div>
        )}
      </div>
    </div>
  )
}
