import { Search, RefreshCw, Sun, Moon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import { useSync } from '../../contexts/SyncContext'

function abrirBusca() {
  window.dispatchEvent(new CustomEvent('conversia:open-busca'))
}

export function Topbar({ title, actions }) {
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const {
    qualquerAtivo,
    syncConversasAtivo, syncConversasProgresso,
    syncMensagensAtivo, syncMensagensProgresso,
    analiseAtiva, analiseProgresso,
  } = useSync()

  const syncLabel = analiseAtiva
    ? `Analisando ${analiseProgresso.atual > 0 ? `${analiseProgresso.atual}/${analiseProgresso.total}` : '...'}`
    : syncMensagensAtivo
    ? `Mensagens ${syncMensagensProgresso.atual > 0 ? `${syncMensagensProgresso.atual}/${syncMensagensProgresso.total}` : '...'}`
    : `Sync ${syncConversasProgresso.pct != null ? `${syncConversasProgresso.pct}%` : '...'}`

  return (
    <header
      className="shrink-0 flex items-center justify-between px-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700"
      style={{ height: 44 }}
    >
      <h1 className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">{title}</h1>
      <div className="flex items-center gap-2">
        {actions}
        {qualquerAtivo && (
          <button
            onClick={() => navigate('/sync')}
            title="Sync em andamento — clique para ver o progresso"
            className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded px-2 py-1 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
          >
            <RefreshCw size={10} className="text-blue-500 animate-spin shrink-0" />
            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">{syncLabel}</span>
          </button>
        )}
        <button
          onClick={abrirBusca}
          className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          <Search size={12} className="text-slate-400 shrink-0" />
          <span className="text-[12px] text-slate-400 w-20 text-left">Buscar...</span>
          <kbd className="text-[10px] text-slate-300 dark:text-slate-500 border border-slate-200 dark:border-slate-600 rounded px-1">⌘K</kbd>
        </button>
        <button
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
          title="Atualizar"
        >
          <RefreshCw size={13} />
        </button>
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-8 h-8 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </button>
      </div>
    </header>
  )
}
