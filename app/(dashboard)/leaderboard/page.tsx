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

function Avatar({ name, isMe }: { name: string; isMe: boolean }) {
  return (
    <div className={cn(
      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
      isMe ? 'bg-[var(--green)]/20 text-[var(--green)]' : 'bg-[var(--border)] text-[var(--muted)]'
    )}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}

const MEDAL = ['🥇', '🥈', '🥉']

function Row({ entry, position, isMe }: { entry: XPEntry; position: number; isMe: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-4 px-5 py-3.5 border-b border-[var(--border)] last:border-0 transition-colors',
      isMe && 'bg-[var(--green)]/5'
    )}>
      {/* Posição */}
      <span className={cn(
        'w-8 text-center font-bold text-sm shrink-0',
        position === 1 ? 'text-amber-400' :
        position === 2 ? 'text-slate-400' :
        position === 3 ? 'text-amber-700' :
        'text-[var(--muted)]'
      )}>
        {position <= 3 ? MEDAL[position - 1] : `#${position}`}
      </span>

      <Avatar name={entry.profile?.name ?? '?'} isMe={isMe} />

      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-semibold truncate',
          isMe ? 'text-[var(--green)]' : 'text-[var(--text)]'
        )}>
          {entry.profile?.name ?? 'Usuário'}
          {isMe && <span className="ml-1.5 text-xs font-normal text-[var(--muted)]">(você)</span>}
        </p>
        <p className="text-xs text-[var(--muted)]">Nível {entry.level}</p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Zap size={13} className="text-[var(--amber)]" />
        <span className="text-sm font-bold text-[var(--text)]">
          {entry.total_xp.toLocaleString('pt-BR')}
        </span>
      </div>
    </div>
  )
}

function Separator() {
  return (
    <div className="flex items-center gap-3 px-5 py-2 border-b border-[var(--border)] bg-[var(--bg)]">
      <span className="w-8 text-center text-[var(--muted)] text-xs">···</span>
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
  const myIndex = entries.findIndex(x => x.user_id === user.id)
  const myRank  = myIndex === -1 ? null : myIndex + 1

  // Top 10 fixo + contexto do usuário se estiver fora do top 10
  const top10 = entries.slice(0, 10)

  const userInTop10 = myRank !== null && myRank <= 10

  // Contexto: ±2 vizinhos do usuário (se fora do top 10)
  let contextRows: { entry: XPEntry; position: number }[] = []
  let showTopSeparator = false
  let showBottomSeparator = false

  if (!userInTop10 && myRank !== null) {
    const ctxStart = Math.max(10, myIndex - 2)       // nunca sobrepõe top 10
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text)] flex items-center gap-2">
          <Trophy size={22} className="text-[var(--amber)]" />
          Ranking
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {total > 0
            ? `${total} participante${total !== 1 ? 's' : ''} · ${myRank ? `sua posição: #${myRank}` : 'você ainda não tem XP'}`
            : 'Ainda sem dados de XP'}
        </p>
      </div>

      {/* Destaque do usuário (fora do top 10) */}
      {myRank && !userInTop10 && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/30">
          <Trophy size={16} className="text-[var(--green)] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--green)]">Sua posição: #{myRank}</p>
            <p className="text-xs text-[var(--muted)]">
              {entries[myIndex].total_xp.toLocaleString('pt-BR')} XP · Nível {entries[myIndex].level}
            </p>
          </div>
          {myRank <= 20 && (
            <span className="text-xs text-[var(--green)] font-medium shrink-0">Top 20! 🔥</span>
          )}
        </div>
      )}

      {total === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-10 text-center text-sm text-[var(--muted)]">
          Nenhum XP registrado ainda. Complete aulas para aparecer no ranking!
        </div>
      ) : (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          {/* Top 10 */}
          {top10.map((entry, i) => (
            <Row
              key={entry.user_id}
              entry={entry}
              position={i + 1}
              isMe={entry.user_id === user.id}
            />
          ))}

          {/* Contexto do usuário fora do top 10 */}
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
