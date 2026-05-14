import { Tag } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { MARCACOES } from '../../lib/mockData'
import { formatRelativeTime } from '../../lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const TIPO_CONFIG = {
  recebeu_valor: { label: '💰 Recebeu Valor', bg: 'bg-green-50 text-green-700 border-green-200' },
  recebeu_link: { label: '🔗 Recebeu Link', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  vendido: { label: '✅ Vendido', bg: 'bg-green-100 text-green-800 border-green-300' },
  lead_quente: { label: '🔥 Lead Quente', bg: 'bg-red-50 text-red-700 border-red-200' },
  followup: { label: '📋 Follow-up', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
}

export function Marcacoes() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Histórico de Marcações" />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-white border border-slate-200 rounded-[6px] overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
            <Tag size={13} className="text-slate-500" />
            <p className="text-[12px] font-semibold text-slate-700">{MARCACOES.length} marcações</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Data</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Contato</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Consultora</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Nota</th>
              </tr>
            </thead>
            <tbody>
              {MARCACOES.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(m => {
                const cfg = TIPO_CONFIG[m.tipo] || { label: m.tipo, bg: 'bg-gray-50 text-gray-600 border-gray-200' }
                return (
                  <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 text-[11px] text-slate-500 whitespace-nowrap">
                      {format(new Date(m.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                      <br />
                      <span className="text-[10px] text-slate-400">{formatRelativeTime(m.created_at)}</span>
                    </td>
                    <td className="px-3 py-2 text-[12px] font-medium text-slate-700">{m.contato_nome}</td>
                    <td className="px-3 py-2 text-[12px] text-slate-600">{m.criado_por}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 border rounded text-[11px] font-medium ${cfg.bg}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-500">{m.nota}</td>
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
