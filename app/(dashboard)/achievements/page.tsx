import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Trophy } from 'lucide-react'

export default async function AchievementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userBadges } = await supabase
    .from('user_badges')
    .select('*, badge:badges(*)')
    .eq('user_id', user.id)
    .order('earned_at', { ascending: false })

  return (
    <div className="p-6 md:p-10 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text)] flex items-center gap-2">
          <Trophy size={22} className="text-[var(--amber)]" />
          Conquistas
        </h1>
        <p className="text-[var(--muted)] text-sm mt-1">
          {userBadges?.length ?? 0} badges conquistados
        </p>
      </div>

      {!userBadges || userBadges.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-16 text-center">
          <Trophy size={40} className="mx-auto mb-4 text-[var(--muted)]" />
          <p className="text-[var(--muted)] text-sm">
            Você ainda não conquistou nenhum badge. Complete aulas e quizzes para ganhar!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {(userBadges as { id: string; badge: { name: string; description: string; icon_url: string | null } | null }[]).map((ub) => (
            <div
              key={ub.id}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col items-center text-center gap-2"
            >
              <div className="w-14 h-14 rounded-full bg-[var(--amber)]/15 flex items-center justify-center text-2xl">
                {ub.badge?.icon_url ? (
                  <img src={ub.badge.icon_url} alt="" className="w-10 h-10 object-contain" />
                ) : '🏆'}
              </div>
              <p className="text-sm font-semibold text-[var(--text)]">{ub.badge?.name}</p>
              <p className="text-xs text-[var(--muted)] line-clamp-2">{ub.badge?.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
