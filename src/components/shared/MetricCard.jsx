export function MetricCard({ label, value, sub, icon: Icon, color = '#3b82f6', trend, onClick }) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-[6px] p-3 flex items-start gap-3 ${onClick ? 'cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors' : ''}`}
      onClick={onClick}
    >
      {Icon && (
        <div className="mt-0.5 shrink-0 w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon size={14} style={{ color }} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-slate-500 font-medium leading-none mb-1">{label}</p>
        <p className="text-xl font-bold text-slate-800 leading-none tabular-nums">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
        {trend !== undefined && (
          <p className={`text-[11px] mt-1 font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs ontem
          </p>
        )}
      </div>
    </div>
  )
}
