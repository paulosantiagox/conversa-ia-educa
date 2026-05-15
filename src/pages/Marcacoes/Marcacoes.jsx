import { useState } from 'react'
import { Tag } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { FiltroPeriodo, filtrarPorPeriodo } from '../../components/shared/FiltroPeriodo'
import { MARCACOES } from '../../lib/mockData'
import { formatRelativeTime } from '../../lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const TIPO_CONFIG = {
  recebeu_valor: { label: '💰 Recebeu Valor', bg: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700' },
  recebeu_link: { label: '🔗 Recebeu Link', bg: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700' },
  vendido: { label: '✅ Vendido', bg: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 border-green-300 dark:border-green-600' },
  lead_quente: { label: '🔥 Lead Quente', bg: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700' },
  followup: { label: '📋 Follow-up', bg: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-700' },
}

export function Marcacoes() {
  const [periodo, setPeriodo] = useState('tudo')
  const marcacoesFiltradas = filtrarPorPeriodo(
    [...MARCACOES].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    'created_at',
    periodo
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Histórico de Marcações" />
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Tag size={13} className="text-slate-500" />
              <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{marcacoesFiltradas.length} marcações</p>
            </div>
            <FiltroPeriodo value={periodo} onChange={setPeriodo} />
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Data</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Contato</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Consultora</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tipo</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nota</th>
              </tr>
            </thead>
            <tbody>
              {marcacoesFiltradas.map(m => {
                const cfg = TIPO_CONFIG[m.tipo] || { label: m.tipo, bg: 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600' }
                return (
                  <tr key={m.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {format(new Date(m.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                      <br />
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{formatRelativeTime(m.created_at)}</span>
                    </td>
                    <td className="px-3 py-2 text-[12px] font-medium text-slate-700 dark:text-slate-200">{m.contato_nome}</td>
                    <td className="px-3 py-2 text-[12px] text-slate-600 dark:text-slate-300">{m.criado_por}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 border rounded text-[11px] font-medium ${cfg.bg}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400">{m.nota}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
