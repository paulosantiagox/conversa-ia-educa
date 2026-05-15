import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, Eye, Download } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { ScoreBar } from '../../components/shared/ScoreBar'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { SkeletonRow } from '../../components/shared/SkeletonLoader'
import { FiltroPeriodo, filtrarPorPeriodo } from '../../components/shared/FiltroPeriodo'
import { useLeadsQuentes } from '../../hooks/useLeadsQuentes'
import { formatRelativeTime } from '../../lib/utils'
import { exportToCsv } from '../../lib/exportCsv'

function tempoSemResposta(at) {
  if (!at) return '—'
  const diff = new Date() - new Date(at)
  const h = Math.floor(diff / 3600000)
  if (h < 1) return '< 1h'
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export function LeadsQuentes() {
  const { leads, loading: loadingLeads } = useLeadsQuentes()
  const [skeletonDone, setSkeletonDone] = useState(false)
  const [periodo, setPeriodo] = useState('tudo')
  useEffect(() => { const t = setTimeout(() => setSkeletonDone(true), 800); return () => clearTimeout(t) }, [])
  const showSkeleton = !skeletonDone || loadingLeads
  const navigate = useNavigate()

  const leadsFiltrados = filtrarPorPeriodo(leads, 'ultima_mensagem_at', periodo)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Leads Quentes" />
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Flame size={14} className="text-red-500" />
              <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{leadsFiltrados.length} leads quentes/alta pontuação</p>
            </div>
            <div className="flex items-center gap-2">
              <FiltroPeriodo value={periodo} onChange={setPeriodo} />
              <button
                onClick={() => exportToCsv(leadsFiltrados, 'leads-quentes')}
                className="flex items-center gap-1 px-2 py-1 border border-slate-200 dark:border-slate-600 rounded text-[11px] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 h-[28px] transition-colors"
              >
                <Download size={11} /> CSV
              </button>
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Contato</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Consultora</th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-32">Score</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Chance</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Última Msg</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Sem Resp.</th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Ação</th>
              </tr>
            </thead>
            <tbody>
              {showSkeleton
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
                : leadsFiltrados.map((lead) => (
                <tr key={lead.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-3 py-2">
                    <p className="text-[12px] font-medium text-slate-800 dark:text-slate-200">{lead.contato_nome}</p>
                    <p className="text-[10px] text-slate-400">{lead.contato_numero}</p>
                  </td>
                  <td className="px-3 py-2 text-[12px] text-slate-600 dark:text-slate-300">{lead.consultora}</td>
                  <td className="px-3 py-2">
                    <ScoreBar score={lead.score_ia} height={4} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-[12px] font-semibold text-green-600">{lead.chance_fechamento}%</span>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400 max-w-[180px] truncate">
                    {lead.ultima_mensagem_texto}
                  </td>
                  <td className="px-3 py-2 text-right text-[11px] text-slate-500 dark:text-slate-400">
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
