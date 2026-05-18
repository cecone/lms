import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GraduationCap, Users, BookOpen, Trophy, TrendingUp, Zap, Flame, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface ReportData {
  total_students: number
  total_enrollments: number
  total_completions: number
  published_courses: number
  courses: {
    id: string
    title: string
    accent_color: string
    creator_name: string
    enrollments: number
    completions: number
    completion_rate: number | null
    total_lessons: number
  }[]
  top_students: {
    name: string
    avatar_url: string | null
    total_xp: number
    level: number
    streak_days: number
    courses_completed: number
  }[]
  recent_enrollments: {
    student_name: string
    avatar_url: string | null
    course_title: string
    accent_color: string
    enrolled_at: string
    completed_at: string | null
  }[]
}

function StatCard({
  label, value, sub, icon, accent,
}: {
  label: string; value: string | number; sub?: string
  icon: React.ReactNode; accent: string
}) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--muted)] font-medium uppercase tracking-wide">{label}</p>
        <div style={{ color: accent }}>{icon}</div>
      </div>
      <p className="text-3xl font-bold text-[var(--text)]">{value}</p>
      {sub && <p className="text-xs text-[var(--muted)]">{sub}</p>}
    </div>
  )
}

function ProgressBar({ value, max, color = 'var(--green)' }: { value: number; max: number; color?: string }) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-[var(--muted)] w-8 text-right">{pct}%</span>
    </div>
  )
}

function Avatar({ name, url, size = 8 }: { name: string; url: string | null; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full object-cover`
  if (url) return <img src={url} alt={name} className={cls} />
  return (
    <div className={`w-${size} h-${size} rounded-full bg-[var(--green)]/20 flex items-center justify-center text-xs font-bold text-[var(--green)] shrink-0`}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'hoje'
  if (days === 1) return 'ontem'
  if (days < 7) return `${days}d atrás`
  if (days < 30) return `${Math.floor(days / 7)}sem atrás`
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase.rpc('get_coordinator_report')

  if (error || !data) {
    return (
      <div className="p-6 md:p-10">
        <p className="text-[var(--muted)] text-sm">Erro ao carregar relatório: {error?.message}</p>
      </div>
    )
  }

  const r = data as ReportData
  const overallCompletionRate = r.total_enrollments === 0
    ? 0
    : Math.round((r.total_completions / r.total_enrollments) * 100)

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text)] flex items-center gap-2">
          <GraduationCap size={22} className="text-[var(--green)]" />
          Relatórios
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">Visão geral da plataforma</p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Alunos" value={r.total_students} icon={<Users size={16} />} accent="var(--blue)" />
        <StatCard label="Matrículas" value={r.total_enrollments} icon={<BookOpen size={16} />} accent="var(--amber)" />
        <StatCard
          label="Taxa de conclusão"
          value={`${overallCompletionRate}%`}
          sub={`${r.total_completions} concluídos`}
          icon={<TrendingUp size={16} />}
          accent="var(--green)"
        />
        <StatCard label="Cursos publicados" value={r.published_courses} icon={<Trophy size={16} />} accent="var(--muted)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cursos — ocupa 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-semibold text-[var(--text)] flex items-center gap-2">
            <BookOpen size={16} className="text-[var(--blue)]" />
            Desempenho por curso
          </h2>

          {r.courses.length === 0 ? (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 text-center text-sm text-[var(--muted)]">
              Nenhum curso publicado.
            </div>
          ) : (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Curso</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Alunos</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide w-40 hidden sm:table-cell">Conclusões</th>
                  </tr>
                </thead>
                <tbody>
                  {r.courses.map((c, idx) => (
                    <tr key={c.id} className={idx < r.courses.length - 1 ? 'border-b border-[var(--border)]' : ''}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-8 rounded-full shrink-0"
                            style={{ backgroundColor: c.accent_color }}
                          />
                          <div>
                            <p className="font-medium text-[var(--text)] leading-tight">{c.title}</p>
                            <p className="text-xs text-[var(--muted)]">{c.creator_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[var(--text)]">
                        {c.enrollments}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-[var(--muted)]">
                            {c.completions} / {c.enrollments}
                          </span>
                          <ProgressBar value={c.completions} max={c.enrollments} color={c.accent_color} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Matrículas recentes */}
          <h2 className="text-base font-semibold text-[var(--text)] flex items-center gap-2 pt-2">
            <Users size={16} className="text-[var(--amber)]" />
            Matrículas recentes
          </h2>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
            {r.recent_enrollments.length === 0 ? (
              <p className="p-6 text-sm text-[var(--muted)] text-center">Nenhuma matrícula ainda.</p>
            ) : (
              <ul>
                {r.recent_enrollments.map((e, idx) => (
                  <li
                    key={idx}
                    className={`flex items-center gap-3 px-4 py-3 ${idx < r.recent_enrollments.length - 1 ? 'border-b border-[var(--border)]' : ''}`}
                  >
                    <Avatar name={e.student_name} url={e.avatar_url} size={8} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text)] truncate">{e.student_name}</p>
                      <p className="text-xs text-[var(--muted)] truncate">{e.course_title}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs text-[var(--muted)]">{relativeDate(e.enrolled_at)}</span>
                      {e.completed_at && <Badge variant="green">Concluído</Badge>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Top alunos — 1/3 */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-[var(--text)] flex items-center gap-2">
            <Trophy size={16} className="text-[var(--amber)]" />
            Top alunos por XP
          </h2>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
            {r.top_students.length === 0 ? (
              <p className="p-6 text-sm text-[var(--muted)] text-center">Sem dados ainda.</p>
            ) : (
              <ul>
                {r.top_students.map((s, idx) => (
                  <li
                    key={idx}
                    className={`flex items-center gap-3 px-4 py-3 ${idx < r.top_students.length - 1 ? 'border-b border-[var(--border)]' : ''}`}
                  >
                    <span className="text-xs font-bold text-[var(--muted)] w-5 text-center shrink-0">
                      {idx + 1}
                    </span>
                    <Avatar name={s.name} url={s.avatar_url} size={8} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text)] truncate">{s.name}</p>
                      <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                        <span className="flex items-center gap-0.5">
                          <Zap size={10} className="text-[var(--amber)]" />
                          {s.total_xp.toLocaleString('pt-BR')}
                        </span>
                        {s.streak_days > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Flame size={10} className="text-orange-400" />
                            {s.streak_days}d
                          </span>
                        )}
                        {s.courses_completed > 0 && (
                          <span className="flex items-center gap-0.5">
                            <CheckCircle size={10} className="text-[var(--green)]" />
                            {s.courses_completed}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-[var(--muted)] shrink-0">Lv{s.level}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
