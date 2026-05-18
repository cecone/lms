import { xpProgressInLevel } from '@/lib/utils'

interface XPBarProps {
  xp: number
  level: number
  streak: number
}

export function XPBar({ xp, level, streak }: XPBarProps) {
  const { current, needed, pct } = xpProgressInLevel(xp)

  return (
    <div className="flex items-center gap-3">
      {/* Streak */}
      <div className="flex items-center gap-1.5 text-[var(--amber)]" title="Streak de dias consecutivos">
        <span aria-label="Fogo" role="img">🔥</span>
        <span className="text-sm font-bold">{streak}</span>
      </div>

      {/* XP + Level */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-xs text-[var(--muted)] mb-1">
          <span>Nível {level}</span>
          <span>{current}/{needed} XP</span>
        </div>
        <div
          className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${pct}% para o nível ${level + 1}`}
        >
          <div
            className="h-full bg-[var(--green)] rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
