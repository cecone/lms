import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Users, Trophy, BookOpen, CheckCircle, BarChart2, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AnalyticsData {
  total_enrollments: number
  completed_enrollments: number
  total_lessons: number
  total_completions: number
  lessons: {
    id: string
    title: string
    content_type: string
    lesson_order: number
    module_title: string
    mod_order: number
    completions: number
    in_progress: number
  }[]
  quizzes: {
    lesson_title: string
    total_attempts: number
    passed_attempts: number
    avg_score: number | null
    pass_rate: number | null
  }[]
}

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  accent: string
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
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-[var(--muted)] w-8 text-right">{pct}%</span>
    </div>
  )
}

const CONTENT_TYPE_LABEL: Record<string, string> = {
  video: 'Vídeo', audio: 'Áudio', pdf: 'PDF',
  scorm: 'SCORM', quiz: 'Quiz', h5p: 'H5P',
}

export default async function CourseAnalyticsPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch course title for header
  const { data: course } = await supabase
    .from('courses')
    .select('id, title, creator_id')
    .eq('id', params.id)
    .single()

  if (!course) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isOwnerOrAdmin =
    course.creator_id === user.id ||
    ['coordenador', 'admin'].includes(profile?.role ?? '')

  if (!isOwnerOrAdmin) notFound()

  const { data: analytics, error } = await supabase
    .rpc('get_course_analytics', { p_course_id: params.id })

  if (error || !analytics) {
    return (
      <div className="p-6 md:p-10">
        <p className="text-[var(--muted)] text-sm">Erro ao carregar analytics: {error?.message}</p>
      </div>
    )
  }

  const a = analytics as AnalyticsData
  const enrollments = a.total_enrollments
  const completionRate = enrollments === 0 ? 0 : Math.round((a.completed_enrollments / enrollments) * 100)
  const avgProgress =
    enrollments === 0 || a.total_lessons === 0
      ? 0
      : Math.round((a.total_completions / (enrollments * a.total_lessons)) * 100)

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/studio/courses/${params.id}`}>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft size={15} />
            Editor
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 size={18} className="text-[var(--green)]" />
            <h1 className="text-xl font-bold text-[var(--text)]">Analytics</h1>
          </div>
          <p className="text-sm text-[var(--muted)] mt-0.5">{course.title}</p>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Matriculados"
          value={enrollments}
          icon={<Users size={16} />}
          accent="var(--blue)"
        />
        <StatCard
          label="Concluíram"
          value={`${completionRate}%`}
          sub={`${a.completed_enrollments} de ${enrollments} alunos`}
          icon={<Trophy size={16} />}
          accent="var(--amber)"
        />
        <StatCard
          label="Progresso médio"
          value={`${avgProgress}%`}
          sub="aulas completadas por aluno"
          icon={<TrendingUp size={16} />}
          accent="var(--green)"
        />
        <StatCard
          label="Total de aulas"
          value={a.total_lessons}
          sub={`${a.total_completions} conclusões totais`}
          icon={<BookOpen size={16} />}
          accent="var(--muted)"
        />
      </div>

      {/* Lesson breakdown */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
          <CheckCircle size={16} className="text-[var(--green)]" />
          Conclusões por aula
        </h2>

        {a.lessons.length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 text-center text-sm text-[var(--muted)]">
            Nenhuma aula cadastrada.
          </div>
        ) : (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Aula</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide hidden sm:table-cell">Módulo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide hidden sm:table-cell">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide w-48">Conclusões</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Em progresso</th>
                </tr>
              </thead>
              <tbody>
                {a.lessons.map((lesson, idx) => (
                  <tr
                    key={lesson.id}
                    className={idx < a.lessons.length - 1 ? 'border-b border-[var(--border)]' : ''}
                  >
                    <td className="px-4 py-3 text-[var(--text)] font-medium">{lesson.title}</td>
                    <td className="px-4 py-3 text-[var(--muted)] hidden sm:table-cell">{lesson.module_title}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs bg-white/5 border border-[var(--border)] px-2 py-0.5 rounded-full text-[var(--muted)]">
                        {CONTENT_TYPE_LABEL[lesson.content_type] ?? lesson.content_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-[var(--text)]">
                          {lesson.completions} / {enrollments}
                        </span>
                        <ProgressBar value={lesson.completions} max={enrollments} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--muted)]">
                      {lesson.in_progress}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Quiz stats */}
      {a.quizzes.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
            <BarChart2 size={16} className="text-[var(--blue)]" />
            Desempenho nos quizzes
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {a.quizzes.map((q) => (
              <div
                key={q.lesson_title}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-4"
              >
                <p className="text-sm font-semibold text-[var(--text)]">{q.lesson_title}</p>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold text-[var(--text)]">{q.total_attempts}</p>
                    <p className="text-xs text-[var(--muted)]">Tentativas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--green)]">{q.pass_rate ?? 0}%</p>
                    <p className="text-xs text-[var(--muted)]">Aprovação</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--amber)]">{q.avg_score ?? '—'}</p>
                    <p className="text-xs text-[var(--muted)]">Nota média</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-[var(--muted)] mb-1.5">
                    <span>Taxa de aprovação</span>
                    <span>{q.passed_attempts} / {q.total_attempts}</span>
                  </div>
                  <ProgressBar value={q.passed_attempts} max={q.total_attempts} color="var(--green)" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
