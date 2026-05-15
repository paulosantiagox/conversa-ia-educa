import { useState } from 'react'
import { Sparkles, Check, X, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Topbar } from '../../components/layout/Topbar'
import { FOLLOWUPS } from '../../lib/mockData'
import { formatRelativeTime } from '../../lib/utils'

export function FollowUp() {
  const [followups, setFollowups] = useState(FOLLOWUPS)
  const navigate = useNavigate()

  const pendentes = followups.filter(f => f.status === 'pendente')
  const enviados = followups.filter(f => f.status === 'enviado')

  function marcar(id, status) {
    setFollowups(prev => prev.map(f => f.id === id ? { ...f, status } : f))
  }

  function Row({ f }) {
    return (
      <tr className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
        <td className="px-3 py-2">
          <p className="text-[12px] font-medium text-slate-800 dark:text-slate-200">{f.contato_nome}</p>
          <p className="text-[10px] text-slate-400">{formatRelativeTime(f.created_at)}</p>
        </td>
        <td className="px-3 py-2 text-[12px] text-slate-600 dark:text-slate-300">{f.consultora}</td>
        <td className="px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400 max-w-[200px]">{f.motivo}</td>
        <td className="px-3 py-2">
          <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded p-2 text-[11px] text-purple-700 dark:text-purple-300 max-w-[220px] italic">
            "{f.mensagem_sugerida}"
          </div>
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate('/inbox')}
              className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
            >
              <Eye size={10} /> Ver
            </button>
            {f.status === 'pendente' && (
              <>
                <button
                  onClick={() => marcar(f.id, 'enviado')}
                  className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-[11px] hover:bg-green-700 transition-colors"
                >
                  <Check size={10} /> Enviado
                </button>
                <button
                  onClick={() => marcar(f.id, 'ignorado')}
                  className="flex items-center gap-1 px-2 py-1 bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded text-[11px] hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                >
                  <X size={10} /> Ignorar
                </button>
              </>
            )}
            {f.status === 'enviado' && (
              <span className="text-[11px] text-green-600 font-medium">✅ Enviado</span>
            )}
          </div>
        </td>
      </tr>
    )
  }

  const TableHead = () => (
    <thead>
      <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
        <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Contato</th>
        <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Consultora</th>
        <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Motivo</th>
        <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Mensagem Sugerida</th>
        <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Ações</th>
      </tr>
    </thead>
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Follow-up IA" />
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <Sparkles size={13} className="text-purple-500" />
            <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{pendentes.length} follow-ups pendentes</p>
          </div>
          {pendentes.length === 0 ? (
            <p className="text-center text-[12px] text-slate-400 py-8">Nenhum follow-up pendente 🎉</p>
          ) : (
            <table className="w-full">
              <TableHead />
              <tbody>{pendentes.map(f => <Row key={f.id} f={f} />)}</tbody>
            </table>
          )}
        </div>

        {enviados.length > 0 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Enviados</p>
            </div>
            <table className="w-full opacity-60">
              <TableHead />
              <tbody>{enviados.map(f => <Row key={f.id} f={f} />)}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
