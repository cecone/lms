import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Trophy, Award } from 'lucide-react'

type UserBadge = {
  id: string
  earned_at: string
  badge: { name: string; description: string; icon_url: string | null } | null
}

function earnedLabel(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'hoje'
  if (days === 1) return 'ontem'
  if (days < 7) return `há ${days}d`
  if (days < 30) return `há ${Math.floor(days / 7)}sem`
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

export default async function AchievementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Atualiza badges retroativos ao abrir a página
  await supabase.rpc('check_and_award_badges', { p_user_id: user.id })

  const { data: userBadgesRaw } = await supabase
    .from('user_badges')
    .select('id, earned_at, badge:badges(name, description, icon_url)')
    .eq('user_id', user.id)
    .order('earned_at', { ascending: false })

  // O embed to-one `badge:badges(...)` é inferido como array pelo client;
  // em runtime vem objeto único (ou null). Cast via unknown resolve o tipo.
  const userBadges = (userBadgesRaw ?? []) as unknown as UserBadge[]
  const count = userBadges.length

  return (
    <div className="p-6 md:p-10 max-w-4xl">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-[26px] leading-tight font-medium tracking-tight text-[var(--text)] flex items-center gap-2">
          <Trophy size={22} className="text-[var(--amber)]" aria-hidden />
          Conquistas
        </h1>
        <p className="text-[var(--muted)] text-sm mt-1 tabular-nums">
          {count === 0
            ? 'Nenhum badge conquistado ainda'
            : `${count} badge${count !== 1 ? 's' : ''} conquistado${count !== 1 ? 's' : ''}`}
        </p>
      </header>

      {count === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--amber)]/15 flex items-center justify-center mx-auto mb-4">
            <Award size={26} className="text-[var(--amber)]" aria-hidden />
          </div>
          <p className="text-[var(--muted)] text-sm max-w-xs mx-auto">
            Complete aulas e quizzes para ganhar seus primeiros badges.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {userBadges.map((ub) => (
            <div
              key={ub.id}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col items-center text-center gap-2"
            >
              {/* Moeda do badge — imagem própria ou ícone padrão */}
              <div className="w-14 h-14 rounded-full bg-[var(--amber)]/15 flex items-center justify-center overflow-hidden shrink-0">
                {ub.badge?.icon_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ub.badge.icon_url} alt="" className="w-10 h-10 object-contain" />
                ) : (
                  <Award size={24} className="text-[var(--amber)]" aria-hidden />
                )}
              </div>

              <p className="text-sm font-medium text-[var(--text)] leading-tight">
                {ub.badge?.name}
              </p>
              <p className="text-xs text-[var(--muted)] line-clamp-2">
                {ub.badge?.description}
              </p>

              {/* Data da conquista */}
              <p className="text-[11px] text-[var(--muted)] mt-auto pt-1 tabular-nums">
                Conquistado {earnedLabel(ub.earned_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
