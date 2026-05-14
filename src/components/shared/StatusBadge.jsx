import { STATUS_COLORS, STATUS_LABELS } from '../../lib/utils'

const BG_MAP = {
  quente: 'bg-red-50 text-red-600 border-red-200',
  morno: 'bg-amber-50 text-amber-600 border-amber-200',
  frio: 'bg-slate-100 text-slate-500 border-slate-200',
  vendido: 'bg-green-50 text-green-600 border-green-200',
  perdido: 'bg-gray-100 text-gray-500 border-gray-300',
  aberta: 'bg-blue-50 text-blue-600 border-blue-200',
  negociando: 'bg-purple-50 text-purple-600 border-purple-200',
}

export function StatusBadge({ status, size = 'sm' }) {
  const cls = BG_MAP[status] || 'bg-gray-100 text-gray-500 border-gray-200'
  const padding = size === 'xs' ? 'px-1.5 py-0' : 'px-2 py-0.5'
  return (
    <span className={`inline-flex items-center border rounded text-[11px] font-medium leading-5 ${padding} ${cls}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}
