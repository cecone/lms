import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Trophy, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

type XPEntry = {
  user_id: string
  total_xp: number
  level: number
  profile: { name: string; avatar_url: string | null } | null
}

// ouro, prata, bronze — tons alinhados à paleta fria
const MEDAL_COLORS = ['#FBBF24', '#C7CDD6', '#C08457']

function RankBadge({ position }: { position: number }) {
  if (position <= 3) {
    const color = MEDAL_COLORS[position - 1]
    return (
      <span
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold tabular-nums shrink-0"
        style={{ backgroundColor: color + '1F', color, border: `1px solid ${color}55` }}
      >
        {position}
      </span>
    )
  }
  return (
    <span className="w-7 text-center text-sm font-medium tabular-nums text-[var(--muted)] shrink-0">
      {position}
    </span>
  )
}

function Avatar({ name, url, isMe }: { name: string; url: string | null; isMe: boolean }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className={cn(
          'w-8 h-8 rounded-full object-cover shrink-0',
          isMe && 'ring-2 ring-[var(--green)]/40'
        )}
      />
    )
  }
  return (
    <div className={cn(
      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0',
      isMe ? 'bg-[var(--green)]/20 text-[var(--green)]' : 'bg-[var(--border)] text-[var(--muted)]'
    )}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}

function Row({ entry, position, isMe }: { entry: XPEntry; position: number; isMe: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-4 px-5 py-3.5 border-b border-[var(--border)] last:border-0 transition-colors',
      isMe && 'bg-[var(--green)]/5'
    )}>
      <RankBadge position={position} />

      <Avatar
        name={entry.profile?.name ?? '?'}
        url={entry.profile?.avatar_url ?? null}
        isMe={isMe}
      />

      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium truncate',
          isMe ? 'text-[var(--green)]' : 'text-[var(--text)]'
        )}>
          {entry.profile?.name ?? 'Usuário'}
          {isMe && <span className="ml-1.5 text-xs font-normal text-[var(--muted)]">(você)</span>}
        </p>
        <p className="text-xs text-[var(--muted)] tabular-nums">Nível {entry.level}</p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Zap size={13} className="text-[var(--amber)]" aria-hidden />
        <span className="text-sm font-semibold text-[var(--text)] tabular-nums">
          {entry.total_xp.toLocaleString('pt-BR')}
        </span>
      </div>
    </div>
  )
}

function Separator() {
  return (
    <div className="flex items-center px-5 py-2 border-b border-[var(--border)]">
      <span className="w-7 text-center text-[var(--muted)] text-xs">···</span>
    </div>
  )
}

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: allXP } = await supabase
    .from('user_xp')
    .select('*, profile:profiles(name, avatar_url)')
    .order('total_xp', { ascending: false })
    .limit(200)

  const entries = (allXP ?? []) as XPEntry[]
  const total   = entries.length
  const myIndex = entries.findIndex((x) => x.user_id === user.id)
  const myRank  = myIndex === -1 ? null : myIndex + 1

  const top10 = entries.slice(0, 10)
  const userInTop10 = myRank !== null && myRank <= 10

  // Contexto: ±2 vizinhos do usuário (se fora do top 10)
  let contextRows: { entry: XPEntry; position: number }[] = []
  let showTopSeparator = false
  let showBottomSeparator = false

  if (!userInTop10 && myRank !== null) {
    const ctxStart = Math.max(10, myIndex - 2)
    const ctxEnd   = Math.min(entries.length - 1, myIndex + 2)
    contextRows = entries.slice(ctxStart, ctxEnd + 1).map((e, i) => ({
      entry: e,
      position: ctxStart + i + 1,
    }))
    showTopSeparator    = ctxStart > 10
    showBottomSeparator = ctxEnd < entries.length - 1
  }

  return (
    <div className="p-6 md:p-10 max-w-2xl">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-[26px] leading-tight font-medium tracking-tight text-[var(--text)] flex items-center gap-2">
          <Trophy size={22} className="text-[var(--amber)]" aria-hidden />
          Ranking
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1 tabular-nums">
          {total > 0
            ? `${total} participante${total !== 1 ? 's' : ''} · ${myRank ? `sua posição: #${myRank}` : 'você ainda não tem XP'}`
            : 'Ainda sem dados de XP'}
        </p>
      </header>

      {/* Foco único — sua posição, quando fora do top 10 */}
      {myRank && !userInTop10 && (
        <div className="mb-6 flex items-center gap-4 px-5 py-4 rounded-2xl bg-[var(--green)]/10 border border-[var(--green)]/30">
          <span className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold tabular-nums shrink-0 bg-[var(--green)]/20 text-[var(--green)]">
            #{myRank}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--green)]">Sua posição</p>
            <p className="text-xs text-[var(--muted)] tabular-nums mt-0.5">
              {entries[myIndex].total_xp.toLocaleString('pt-BR')} XP · Nível {entries[myIndex].level}
            </p>
          </div>
          {myRank <= 20 && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-[var(--green)]/15 text-[var(--green)] shrink-0">
              Top 20
            </span>
          )}
        </div>
      )}

      {total === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-10 text-center text-sm text-[var(--muted)]">
          Nenhum XP registrado ainda. Complete aulas para aparecer no ranking!
        </div>
      ) : (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          {top10.map((entry, i) => (
            <Row
              key={entry.user_id}
              entry={entry}
              position={i + 1}
              isMe={entry.user_id === user.id}
            />
          ))}

          {!userInTop10 && contextRows.length > 0 && (
            <>
              {showTopSeparator && <Separator />}
              {contextRows.map(({ entry, position }) => (
                <Row
                  key={entry.user_id}
                  entry={entry}
                  position={position}
                  isMe={entry.user_id === user.id}
                />
              ))}
              {showBottomSeparator && <Separator />}
            </>
          )}
        </div>
      )}
    </div>
  )
}
