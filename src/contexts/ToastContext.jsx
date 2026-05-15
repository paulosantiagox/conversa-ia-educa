import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

let _id = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const add = useCallback((message, type = 'info') => {
    const id = ++_id
    setToasts(prev => {
      const next = [...prev, { id, message, type }]
      return next.slice(-3)
    })
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = {
    success: (msg) => add(msg, 'success'),
    error: (msg) => add(msg, 'error'),
    info: (msg) => add(msg, 'info'),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

const BORDER_COLORS = {
  success: 'border-l-[#22c55e]',
  error: 'border-l-[#ef4444]',
  info: 'border-l-[#3b82f6]',
}

const ICONS = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-2.5 bg-white dark:bg-slate-800 border border-l-4 ${BORDER_COLORS[t.type]} border-slate-200 dark:border-slate-600 rounded-[6px] shadow-lg px-3 py-2.5 min-w-[220px] max-w-[320px] animate-toast-in`}
          style={{ animation: 'toast-slide-up 0.2s ease-out' }}
        >
          <span className={`text-[13px] font-bold shrink-0 ${
            t.type === 'success' ? 'text-green-500' : t.type === 'error' ? 'text-red-500' : 'text-blue-500'
          }`}>{ICONS[t.type]}</span>
          <span className="text-[12px] text-slate-700 dark:text-slate-200 flex-1">{t.message}</span>
          <button
            onClick={() => onRemove(t.id)}
            className="text-slate-300 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 shrink-0 text-[14px] leading-none"
          >×</button>
        </div>
      ))}
    </div>
  )
}
