import { useNavigate } from 'react-router-dom'
import { Flame, Eye } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { ScoreBar } from '../../components/shared/ScoreBar'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { useLeadsQuentes } from '../../hooks/useLeadsQuentes'
import { formatRelativeTime } from '../../lib/utils'

function tempoSemResposta(at) {
  if (!at) return '—'
  const diff = new Date() - new Date(at)
  const h = Math.floor(diff / 3600000)
  if (h < 1) return '< 1h'
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export function LeadsQuentes() {
  const { leads } = useLeadsQuentes()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Leads Quentes" />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-white border border-slate-200 rounded-[6px] overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
            <Flame size={14} className="text-red-500" />
            <p className="text-[12px] font-semibold text-slate-700">{leads.length} leads quentes/alta pontuação</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Contato</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Consultora</th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wide w-32">Score</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Chance</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Última Msg</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Sem Resp.</th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Ação</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2">
                    <p className="text-[12px] font-medium text-slate-800">{lead.contato_nome}</p>
                    <p className="text-[10px] text-slate-400">{lead.contato_numero}</p>
                  </td>
                  <td className="px-3 py-2 text-[12px] text-slate-600">{lead.consultora}</td>
                  <td className="px-3 py-2">
                    <ScoreBar score={lead.score_ia} height={4} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-[12px] font-semibold text-green-600">{lead.chance_fechamento}%</span>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-500 max-w-[180px] truncate">
                    {lead.ultima_mensagem_texto}
                  </td>
                  <td className="px-3 py-2 text-right text-[11px] text-slate-500">
                    {tempoSemResposta(lead.ultima_mensagem_at)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <StatusBadge status={lead.status} size="xs" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => navigate('/inbox')}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-[11px] rounded hover:bg-blue-700 transition-colors"
                    >
                      <Eye size={10} /> Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
