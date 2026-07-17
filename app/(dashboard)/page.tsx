import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { XPBar } from '@/components/gamification/xp-bar'
import { StreakPing } from '@/components/gamification/streak-ping'
import { OnboardingModal } from '@/components/onboarding/onboarding-modal'
import { BookOpen, Clock, CheckCircle, PlayCircle, ArrowRight } from 'lucide-react'
import type { Profile, UserXP } from '@/types/database'

type EnrollmentRow = {
  id: string
  completed_at: string | null
  course: {
    id: string
    title: string
    thumbnail_url: string | null
    accent_color: string
  }
}

// Foco visível compartilhado por todos os cards clicáveis (acessibilidade de teclado)
const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green)] ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]'

export default async function DashboardHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: userXp }, { data: enrollments }, { data: progressData }] =
    await Promise.all([
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

  // Anexa progresso a cada matrícula
  const courses = ((enrollments ?? []) as EnrollmentRow[]).map((e) => {
    const prog = progressMap.get(e.course.id)
    const total = prog?.total_lessons ?? 0
    const completed = prog?.completed_lessons ?? 0
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100)
    return { ...e, total, completed, pct }
  })

  // Foco único da tela: o curso em andamento mais avançado (senão, o primeiro não concluído)
  const inProgress = courses.filter((c) => !c.completed_at)
  const hero =
    inProgress.find((c) => c.pct > 0) ?? inProgress[0] ?? null
  const rest = courses.filter((c) => c.id !== hero?.id)

  const stats = [
    { label: 'Cursos', value: courses.length, icon: BookOpen, color: 'var(--blue)' },
    { label: 'Em progresso', value: inProgress.length, icon: Clock, color: 'var(--amber)' },
    { label: 'Concluídos', value: courses.filter((c) => c.completed_at).length, icon: CheckCircle, color: 'var(--green)' },
  ]

  const firstName = profile?.name?.split(' ')[0] ?? ''
  const onboarded = (profile as unknown as { onboarded?: boolean })?.onboarded ?? true

  return (
    <div className="p-6 md:p-10 max-w-4xl">
      <StreakPing />
      {!onboarded && <OnboardingModal name={profile?.name ?? ''} />}

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-[26px] leading-tight font-medium tracking-tight text-[var(--text)]">
          Olá, {firstName}
        </h1>
        <p className="text-[var(--muted)] mt-1 text-sm">Continue de onde parou.</p>
      </header>

      {/* Foco único — retomar o curso em andamento */}
      {hero && (
        <a
          href={`/courses/${hero.course.id}`}
          className={`group block rounded-2xl p-6 mb-8 transition-colors ${focusRing}`}
          style={{
            backgroundColor: hero.course.accent_color + '18',
            border: `1px solid ${hero.course.accent_color}44`,
          }}
        >
          <p className="text-xs font-medium text-[var(--muted)] mb-3">Continuar assistindo</p>

          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-xl shrink-0 flex items-center justify-center text-xl font-medium overflow-hidden"
              style={{ backgroundColor: hero.course.accent_color + '22', color: hero.course.accent_color }}
            >
              {hero.course.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={hero.course.thumbnail_url} alt="" className="w-full h-full object-cover" />
              ) : (
                hero.course.title[0]
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-medium text-[var(--text)] truncate">{hero.course.title}</h2>
              <p className="text-sm text-[var(--muted)] mt-0.5 tabular-nums">
                {hero.completed} de {hero.total} aulas · {hero.pct}%
              </p>
            </div>

            <span
              className="hidden sm:inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shrink-0 transition-transform group-hover:translate-x-0.5"
              style={{ backgroundColor: hero.course.accent_color, color: '#0A0C10' }}
            >
              <PlayCircle size={16} />
              Continuar
            </span>
          </div>

          {/* Progresso */}
          <div className="mt-5 h-2 bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${hero.pct}%`, backgroundColor: hero.course.accent_color }}
            />
          </div>
        </a>
      )}

      {/* Métricas — superfície quieta, sem borda */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[var(--surface)] rounded-xl p-4 flex flex-col gap-2">
            <Icon size={16} style={{ color }} aria-hidden />
            <span className="text-3xl font-semibold tracking-tight tabular-nums text-[var(--text)] leading-none">
              {value}
            </span>
            <span className="text-xs text-[var(--muted)]">{label}</span>
          </div>
        ))}
      </div>

      {/* XP — faixa discreta */}
      <div className="bg-[var(--surface)] rounded-xl p-4 mb-10">
        <XPBar xp={xp.total_xp} level={xp.level} streak={xp.streak_days} />
      </div>

      {/* Demais cursos */}
      <section aria-labelledby="courses-heading">
        <h2 id="courses-heading" className="text-sm font-medium text-[var(--muted)] mb-4">
          {hero ? 'Outros cursos' : 'Meus cursos'}
        </h2>

        {courses.length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-10 text-center">
            <p className="text-[var(--muted)] text-sm">
              Você ainda não está matriculado em nenhum curso.
            </p>
            <a
              href="/courses"
              className={`mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--green)] hover:underline rounded ${focusRing}`}
            >
              Explorar cursos
              <ArrowRight size={15} />
            </a>
          </div>
        ) : rest.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Nenhum outro curso no momento.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rest.map((c) => (
              <a
                key={c.id}
                href={`/courses/${c.course.id}`}
                className={`bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--border-strong)] transition-colors group ${focusRing}`}
              >
                <div
                  className="w-full h-24 rounded-lg mb-3 flex items-center justify-center text-sm font-medium overflow-hidden"
                  style={{ backgroundColor: c.course.accent_color + '22', color: c.course.accent_color }}
                >
                  {c.course.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    c.course.title[0]
                  )}
                </div>

                <p className="font-medium text-sm text-[var(--text)] group-hover:text-[var(--green)] transition-colors line-clamp-2 mb-3">
                  {c.course.title}
                </p>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[var(--muted)] tabular-nums">
                    <span>{c.completed} / {c.total} aulas</span>
                    <span style={{ color: c.pct === 100 ? 'var(--green)' : undefined }}>{c.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${c.pct}%`,
                        backgroundColor: c.pct === 100 ? 'var(--green)' : c.course.accent_color,
                      }}
                    />
                  </div>
                </div>

                {c.completed_at && <Badge variant="green" className="mt-2">Concluído</Badge>}
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
