import { getScoreColor } from '../../lib/utils'

export function ScoreBar({ score, showLabel = true, height = 4 }) {
  const color = getScoreColor(score)
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <div className={`flex-1 bg-slate-200 rounded-full overflow-hidden`} style={{ height }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <span className="text-[11px] font-semibold tabular-nums" style={{ color, minWidth: 24 }}>
          {score}
        </span>
      )}
    </div>
  )
}
