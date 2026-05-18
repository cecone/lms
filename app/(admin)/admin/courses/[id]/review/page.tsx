import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ReviewActions } from './review-actions'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Video, Music, FileText, HelpCircle,
  Layers, Clock, BookOpen, Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const CONTENT_ICON: Record<string, React.ElementType> = {
  video: Video, audio: Music, pdf: FileText,
  quiz: HelpCircle, scorm: Layers, h5p: Layers,
}

function ContentIcon({ type }: { type: string }) {
  const Icon = CONTENT_ICON[type] ?? Layers
  return <Icon size={13} />
}

export default async function ReviewPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Carrega curso com criador
  const { data: course } = await supabase
    .from('courses')
    .select('*, creator:profiles(name, email)')
    .eq('id', params.id)
    .single()

  if (!course || course.status !== 'pending') notFound()

  // Módulos + aulas
  const { data: modules } = await supabase
    .from('modules')
    .select('id, title, order, lessons(id, title, description, content_type, content_url, duration_seconds, is_free_preview, order)')
    .eq('course_id', params.id)
    .order('order')
    .order('order', { referencedTable: 'lessons' })

  // Quiz data para aulas do tipo quiz
  const allLessons = (modules ?? []).flatMap((m: any) => m.lessons ?? [])
  const quizLessonIds = allLessons.filter((l: any) => l.content_type === 'quiz').map((l: any) => l.id)

  const { data: quizzes } = quizLessonIds.length
    ? await supabase
        .from('quizzes')
        .select('lesson_id, questions, passing_score, max_attempts')
        .in('lesson_id', quizLessonIds)
    : { data: [] }

  const quizMap = new Map((quizzes ?? []).map((q: any) => [q.lesson_id, q]))

  const creator = course.creator as { name: string; email: string } | null
  const totalLessons = allLessons.length

  const TRAIL_LABEL: Record<string, string> = {
    linear: 'Linear', nonlinear: 'Livre', adaptive: 'Adaptativo',
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-[var(--muted)] hover:text-[var(--text)] transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[var(--text)] truncate">{course.title}</h1>
            <Badge variant="amber">Em revisão</Badge>
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            por {creator?.name ?? 'desconhecido'} · {creator?.email}
          </p>
        </div>
        <Link href={`/courses/${course.id}`} target="_blank" className="text-[var(--muted)] hover:text-[var(--text)] transition-colors" title="Preview público">
          <Eye size={17} />
        </Link>
      </div>

      {/* Decisão */}
      <ReviewActions courseId={course.id} />

      {/* Informações do curso */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text)]">Detalhes do curso</h2>

        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-bold text-lg"
            style={{ backgroundColor: course.accent_color + '22', color: course.accent_color }}
          >
            {course.title[0]}
          </div>
          <div className="flex gap-4 text-xs text-[var(--muted)]">
            <span className="flex items-center gap-1">
              <BookOpen size={12} />{totalLessons} aula{totalLessons !== 1 ? 's' : ''}
            </span>
            {course.estimated_hours && (
              <span className="flex items-center gap-1">
                <Clock size={12} />{course.estimated_hours}h estimadas
              </span>
            )}
            <span>{TRAIL_LABEL[course.trail_type] ?? course.trail_type}</span>
          </div>
        </div>

        {course.description && (
          <p className="text-sm text-[var(--muted)] leading-relaxed">{course.description}</p>
        )}
      </section>

      {/* Módulos e aulas */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text)]">
          Módulos e aulas ({(modules ?? []).length} módulo{(modules ?? []).length !== 1 ? 's' : ''})
        </h2>

        {(modules ?? []).length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 text-center text-sm text-[var(--muted)]">
            Nenhum módulo cadastrado.
          </div>
        ) : (
          (modules as any[]).map((mod) => (
            <div key={mod.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
              {/* Module header */}
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--text)]">{mod.title}</span>
                <span className="text-xs text-[var(--muted)]">
                  {(mod.lessons ?? []).length} aula{(mod.lessons ?? []).length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Lessons */}
              <div className="divide-y divide-[var(--border)]">
                {(mod.lessons ?? []).length === 0 && (
                  <p className="text-xs text-[var(--muted)] px-4 py-3">Sem aulas.</p>
                )}
                {(mod.lessons as any[]).map((lesson) => {
                  const quiz = quizMap.get(lesson.id)
                  return (
                    <div key={lesson.id} className="px-4 py-3 space-y-2">
                      {/* Lesson row */}
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--muted)]">
                          <ContentIcon type={lesson.content_type} />
                        </span>
                        <span className="flex-1 text-xs text-[var(--text)] font-medium truncate">
                          {lesson.title}
                        </span>
                        <span className="text-[10px] text-[var(--muted)] uppercase tracking-wide shrink-0">
                          {lesson.content_type}
                        </span>
                        {lesson.is_free_preview && (
                          <span className="text-[10px] text-[var(--green)] font-bold shrink-0">FREE</span>
                        )}
                        {lesson.duration_seconds && (
                          <span className="text-[10px] text-[var(--muted)] shrink-0">
                            {Math.round(lesson.duration_seconds / 60)}min
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      {lesson.description && (
                        <p className="text-xs text-[var(--muted)] ml-5 leading-relaxed">{lesson.description}</p>
                      )}

                      {/* Content URL (non-quiz) */}
                      {lesson.content_url && lesson.content_type !== 'scorm' && (
                        <p className="text-[10px] text-[var(--muted)] ml-5 truncate font-mono">
                          {lesson.content_url}
                        </p>
                      )}

                      {/* SCORM marker */}
                      {lesson.content_type === 'scorm' && lesson.content_url && (
                        <p className="text-[10px] text-[var(--muted)] ml-5">
                          Pacote SCORM enviado ✓
                        </p>
                      )}

                      {/* Quiz preview */}
                      {lesson.content_type === 'quiz' && (
                        <div className="ml-5 mt-1">
                          {!quiz ? (
                            <p className="text-[10px] text-amber-400">Quiz sem perguntas configuradas</p>
                          ) : (
                            <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                              <div className="px-3 py-2 bg-[var(--bg)] border-b border-[var(--border)] flex items-center justify-between">
                                <span className="text-[10px] text-[var(--muted)]">
                                  {(quiz.questions as any[]).length} pergunta{(quiz.questions as any[]).length !== 1 ? 's' : ''} · mín. {quiz.passing_score}% · {quiz.max_attempts} tentativa{quiz.max_attempts !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="divide-y divide-[var(--border)]">
                                {(quiz.questions as any[]).map((q: any, idx: number) => (
                                  <div key={q.id} className="px-3 py-2.5">
                                    <p className="text-xs text-[var(--text)] mb-1.5">
                                      <span className="text-[var(--muted)] mr-1">{idx + 1}.</span>{q.text}
                                    </p>
                                    <ul className="space-y-1 ml-3">
                                      {(q.options as any[]).map((opt: any) => (
                                        <li
                                          key={opt.id}
                                          className={cn(
                                            'text-[10px] px-2 py-1 rounded border',
                                            opt.id === q.correct_option_id
                                              ? 'border-[var(--green)]/40 bg-[var(--green)]/10 text-[var(--green)]'
                                              : 'border-transparent text-[var(--muted)]'
                                          )}
                                        >
                                          {opt.text}
                                          {opt.id === q.correct_option_id && <span className="ml-1 font-bold">✓</span>}
                                        </li>
                                      ))}
                                    </ul>
                                    {q.explanation && (
                                      <p className="text-[10px] text-[var(--muted)] ml-3 mt-1 italic">{q.explanation}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Decisão duplicada no final (página longa) */}
      <ReviewActions courseId={course.id} />
    </div>
  )
}
