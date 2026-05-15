function Pulse({ className }) {
  return <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded ${className}`} />
}

export function SkeletonCard({ height = 72 }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[6px] p-3 space-y-2" style={{ height }}>
      <div className="flex items-center gap-2">
        <Pulse className="w-7 h-7 rounded-full shrink-0" />
        <Pulse className="h-3 flex-1" />
      </div>
      <Pulse className="h-5 w-1/2" />
      <Pulse className="h-2 w-3/4" />
    </div>
  )
}

export function SkeletonRow({ cols = 5 }) {
  const widths = ['w-28', 'w-16', 'w-20', 'w-12', 'w-16', 'w-10']
  return (
    <tr className="border-b border-slate-50 dark:border-slate-700/50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-3 py-2.5">
          <Pulse className={`h-3 ${widths[i % widths.length]}`} />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonList({ count = 5 }) {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-2 px-3 py-3">
          <Pulse className="w-8 h-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <Pulse className="h-3 w-32" />
              <Pulse className="h-2.5 w-10 shrink-0" />
            </div>
            <Pulse className="h-2.5 w-full" />
            <Pulse className="h-2 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}
