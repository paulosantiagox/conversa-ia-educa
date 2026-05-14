import { Search, RefreshCw } from 'lucide-react'

export function Topbar({ title, actions }) {
  return (
    <header
      className="shrink-0 flex items-center justify-between px-4 bg-white border-b border-slate-200"
      style={{ height: 44 }}
    >
      <h1 className="text-[13px] font-semibold text-slate-700">{title}</h1>
      <div className="flex items-center gap-2">
        {actions}
        <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded px-2 py-1">
          <Search size={12} className="text-slate-400" />
          <input
            placeholder="Buscar..."
            className="bg-transparent text-[12px] outline-none w-32 text-slate-600 placeholder-slate-400"
          />
        </div>
        <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
          <RefreshCw size={13} />
        </button>
      </div>
    </header>
  )
}
