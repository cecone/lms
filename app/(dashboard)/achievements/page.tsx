import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Trophy, Award, Lock } from 'lucide-react'

type TriggerType =
  | 'lesson_complete'
  | 'course_complete'
  | 'streak'
  | 'xp_reached'
  | 'quiz_perfect'

type Badge = {
  id: string
  name: string
  description: string
  trigger_type: TriggerType
  trigger_value: number
  course_id: string | null
  icon_url: string | null
}

function plural(n: number, sing: string, plur: string) {
  return `${n.toLocaleString('pt-BR')} ${n === 1 ? sing : plur}`
}

// Texto de "como desbloquear", derivado do gatilho do badge
function unlockHint(b: Badge, courseName?: string): string {
  switch (b.trigger_type) {
    case 'lesson_complete':
      return courseName
        ? `Conclua ${plural(b.trigger_value, 'aula', 'aulas')} em ${courseName}`
        : `Conclua ${plural(b.trigger_value, 'aula', 'aulas')}`
    case 'course_complete':
      return courseName ? `Conclua o curso ${courseName}` : 'Conclua um curso'
    case 'streak':
      return `Mantenha um streak de ${plural(b.trigger_value, 'dia', 'dias')}`
    case 'xp_reached':
      return `Acumule ${b.trigger_value.toLocaleString('pt-BR')} XP`
    case 'quiz_perfect':
      return `Acerte ${plural(b.trigger_value, 'quiz perfeito', 'quizzes perfeitos')}`
    default:
      return b.description
  }
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

  // Nota: não chamamos check_and_award_badges aqui. Ele já roda no banco ao
  // final de add_xp (aulas/quizzes) e de maybe_issue_certificate (conclusão de
  // curso), então esta página é somente leitura.
  const [{ data: allBadges }, { data: earnedRaw }, { data: coursesRaw }] = await Promise.all([
    supabase
      .from('badges')
      .select('id, name, description, trigger_type, trigger_value, course_id, icon_url')
      .order('trigger_type')
      .order('trigger_value'),
    // reaproveita o relacionamento que já funcionava, sem supor o nome da FK
    supabase
      .from('user_badges')
      .select('earned_at, badge:badges(id)')
      .eq('user_id', user.id),
    supabase.from('courses').select('id, title'),
  ])

  const badges = (allBadges ?? []) as Badge[]

  // Map badge_id -> earned_at
  const earnedMap = new Map<string, string>()
  for (const row of (earnedRaw ?? []) as unknown as { earned_at: string; badge: { id: string } | null }[]) {
    if (row.badge?.id) earnedMap.set(row.badge.id, row.earned_at)
  }

  const courseMap = new Map(
    ((coursesRaw ?? []) as { id: string; title: string }[]).map((c) => [c.id, c.title])
  )

  const earned = badges.filter((b) => earnedMap.has(b.id))
  const locked = badges.filter((b) => !earnedMap.has(b.id))
  const total = badges.length
  const pct = total === 0 ? 0 : Math.round((earned.length / total) * 100)

  return (
    <div className="p-6 md:p-10 max-w-4xl">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-[26px] leading-tight font-medium tracking-tight text-[var(--text)] flex items-center gap-2">
          <Trophy size={22} className="text-[var(--amber)]" aria-hidden />
          Conquistas
        </h1>
        <p className="text-[var(--muted)] text-sm mt-1 tabular-nums">
          {total === 0
            ? 'Nenhum badge disponível ainda'
            : `${earned.length} de ${total} conquistados`}
        </p>
      </header>

      {/* Foco único — progresso geral */}
      {total > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[var(--text)]">Seu progresso</span>
            <span className="text-sm font-semibold text-[var(--amber)] tabular-nums">{pct}%</span>
          </div>
          <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--amber)] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {total === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--amber)]/15 flex items-center justify-center mx-auto mb-4">
            <Award size={26} className="text-[var(--amber)]" aria-hidden />
          </div>
          <p className="text-[var(--muted)] text-sm max-w-xs mx-auto">
            Ainda não há badges cadastrados na plataforma.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Conquistados */}
          {earned.length > 0 && (
            <section aria-labelledby="earned-heading">
              <h2 id="earned-heading" className="text-sm font-medium text-[var(--muted)] mb-4">
                Conquistados · {earned.length}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {earned.map((b) => (
                  <div
                    key={b.id}
                    className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col items-center text-center gap-2"
                  >
                    <div className="w-14 h-14 rounded-full bg-[var(--amber)]/15 flex items-center justify-center overflow-hidden shrink-0">
                      {b.icon_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.icon_url} alt="" className="w-10 h-10 object-contain" />
                      ) : (
                        <Award size={24} className="text-[var(--amber)]" aria-hidden />
                      )}
                    </div>
                    <p className="text-sm font-medium text-[var(--text)] leading-tight">{b.name}</p>
                    <p className="text-xs text-[var(--muted)] line-clamp-2">{b.description}</p>
                    <p className="text-[11px] text-[var(--muted)] mt-auto pt-1 tabular-nums">
                      Conquistado {earnedLabel(earnedMap.get(b.id)!)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Bloqueados */}
          {locked.length > 0 && (
            <section aria-labelledby="locked-heading">
              <h2 id="locked-heading" className="text-sm font-medium text-[var(--muted)] mb-4">
                A conquistar · {locked.length}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {locked.map((b) => {
                  const courseName = b.course_id ? courseMap.get(b.course_id) : undefined
                  return (
                    <div
                      key={b.id}
                      className="bg-[var(--surface)]/50 border border-[var(--border)] rounded-xl p-4 flex flex-col items-center text-center gap-2"
                    >
                      <div className="relative w-14 h-14 rounded-full bg-[var(--border)] flex items-center justify-center overflow-hidden shrink-0">
                        {b.icon_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={b.icon_url}
                            alt=""
                            className="w-10 h-10 object-contain opacity-25 grayscale"
                          />
                        ) : (
                          <Award size={24} className="text-[var(--muted)] opacity-50" aria-hidden />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Lock size={16} className="text-[var(--muted)]" aria-hidden />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-[var(--muted)] leading-tight">{b.name}</p>
                      <p className="text-xs text-[var(--muted)] opacity-70 line-clamp-2 mt-auto pt-1">
                        {unlockHint(b, courseName)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
