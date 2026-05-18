import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { XPBar } from '@/components/gamification/xp-bar'
import { StreakPing } from '@/components/gamification/streak-ping'
import { OnboardingModal } from '@/components/onboarding/onboarding-modal'
import { BookOpen, Clock, CheckCircle } from 'lucide-react'
import type { Profile, UserXP } from '@/types/database'

export default async function DashboardHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: userXp }, { data: enrollments }, { data: progressData }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single<Profile>(),
    supabase.from('user_xp').select('*').eq('user_id', user.id).single<UserXP>(),
    supabase
      .from('enrollments')
      .select('*, course:courses(id, title, thumbnail_url, accent_color)')
      .eq('user_id', user.id)
      .limit(4),
    supabase.rpc('get_user_courses_progress', { p_user_id: user.id }),
  ])

  const progressMap = new Map(
    ((progressData ?? []) as { course_id: string; total_lessons: number; completed_lessons: number }[])
      .map((r) => [r.course_id, r])
  )

  const xp = userXp ?? { total_xp: 0, level: 1, streak_days: 0 }

  return (
    <div className="p-6 md:p-10 max-w-4xl">
      <StreakPing />
      {!(profile as unknown as { onboarded: boolean }).onboarded && (
        <OnboardingModal name={profile?.name ?? ''} />
      )}
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text)]">
          Olá, {profile?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-[var(--muted)] mt-1 text-sm">
          Continue de onde parou.
        </p>
      </div>

      {/* XP Bar */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 mb-6">
        <XPBar
          xp={xp.total_xp}
          level={xp.level}
          streak={xp.streak_days}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Cursos', value: enrollments?.length ?? 0, icon: BookOpen, color: 'var(--blue)' },
          { label: 'Em progresso', value: enrollments?.filter(e => !e.completed_at).length ?? 0, icon: Clock, color: 'var(--amber)' },
          { label: 'Concluídos', value: enrollments?.filter(e => e.completed_at).length ?? 0, icon: CheckCircle, color: 'var(--green)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-2">
            <Icon size={16} style={{ color }} />
            <span className="text-2xl font-bold text-[var(--text)]">{value}</span>
            <span className="text-xs text-[var(--muted)]">{label}</span>
          </div>
        ))}
      </div>

      {/* Cursos em progresso */}
      <section aria-labelledby="courses-heading">
        <h2 id="courses-heading" className="text-base font-semibold text-[var(--text)] mb-4">
          Meus cursos
        </h2>

        {!enrollments || enrollments.length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-10 text-center">
            <p className="text-[var(--muted)] text-sm">Você ainda não está matriculado em nenhum curso.</p>
            <a href="/courses" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--green)] hover:underline">
              Explorar cursos →
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(enrollments as { id: string; completed_at: string | null; course: { id: string; title: string; thumbnail_url: string | null; accent_color: string } }[]).map((enrollment) => {
              const prog = progressMap.get(enrollment.course.id)
              const total = prog?.total_lessons ?? 0
              const completed = prog?.completed_lessons ?? 0
              const pct = total === 0 ? 0 : Math.round((completed / total) * 100)

              return (
                <a
                  key={enrollment.id}
                  href={`/courses/${enrollment.course.id}`}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--muted)] transition-colors group"
                >
                  <div
                    className="w-full h-24 rounded-lg mb-3 flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: enrollment.course.accent_color + '22', color: enrollment.course.accent_color }}
                  >
                    {enrollment.course.thumbnail_url
                      ? <img src={enrollment.course.thumbnail_url} alt="" className="w-full h-full object-cover rounded-lg" />
                      : enrollment.course.title[0]
                    }
                  </div>
                  <p className="font-semibold text-sm text-[var(--text)] group-hover:text-[var(--green)] transition-colors line-clamp-2 mb-3">
                    {enrollment.course.title}
                  </p>

                  {/* Barra de progresso */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                      <span>{completed} / {total} aulas</span>
                      <span style={{ color: pct === 100 ? 'var(--green)' : undefined }}>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: pct === 100 ? 'var(--green)' : enrollment.course.accent_color,
                        }}
                      />
                    </div>
                  </div>

                  {enrollment.completed_at && (
                    <Badge variant="green" className="mt-2">Concluído</Badge>
                  )}
                </a>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
