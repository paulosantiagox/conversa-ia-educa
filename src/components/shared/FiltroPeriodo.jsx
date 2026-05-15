const OPCOES = [
  { label: 'Hoje', value: 'hoje' },
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
  { label: 'Tudo', value: 'tudo' },
]

export function FiltroPeriodo({ value, onChange }) {
  return (
    <div className="flex items-center border border-slate-200 dark:border-slate-600 rounded overflow-hidden h-[28px]">
      {OPCOES.map((op, i) => (
        <button
          key={op.value}
          onClick={() => onChange(op.value)}
          className={[
            'px-2.5 text-[11px] font-medium h-full transition-colors',
            i > 0 ? 'border-l border-slate-200 dark:border-slate-600' : '',
            value === op.value
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700',
          ].join(' ')}
        >
          {op.label}
        </button>
      ))}
    </div>
  )
}

export function filtrarPorPeriodo(items, campo, periodo) {
  if (periodo === 'tudo') return items
  const agora = Date.now()
  const limites = { hoje: 86400000, '7d': 604800000, '30d': 2592000000 }
  const limite = limites[periodo] ?? Infinity
  return items.filter(item => {
    const val = item[campo]
    if (!val) return false
    return agora - new Date(val).getTime() <= limite
  })
}
