/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LessonPlayer } from '@/components/player/lesson-player'
import { LessonComments } from '@/components/lesson/lesson-comments'
import { LessonSidebarDrawer } from '@/components/lesson/lesson-sidebar-drawer'
import { ArrowLeft, ArrowRight, CheckCircle, Circle, Lock, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContentType, LessonStatus } from '@/types/database'

interface PageProps {
  params: { id: string; lessonId: string }
}

export default async function LearnPage({ params }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Busca a aula atual
  const { data: lesson } = await supabase
    .from('lessons')
    .select('*, module:modules(id, title, course_id)')
    .eq('id', params.lessonId)
    .single()

  if (!lesson) notFound()

  const courseId = (lesson.module as any)?.course_id ?? params.id

  // Verifica matrícula (aulas gratuitas são permitidas sem matrícula)
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .maybeSingle()

  if (!enrollment && !lesson.is_free_preview) {
    redirect(`/courses/${courseId}`)
  }

  // Busca curso (para título e accent_color)
  const { data: course } = await supabase
    .from('courses')
    .select('id, title, accent_color, trail_type')
    .eq('id', courseId)
    .single()

  // Módulos + aulas do curso (sidebar)
  const { data: modules } = await supabase
    .from('modules')
    .select('id, title, order, lessons(id, title, order, content_type, duration_seconds, is_free_preview)')
    .eq('course_id', courseId)
    .order('order')
    .order('order', { referencedTable: 'lessons' })

  // Progresso do usuário
  const lessonIds = (modules ?? []).flatMap((m: any) => m.lessons?.map((l: any) => l.id) ?? [])
  const { data: progressRows } = lessonIds.length
    ? await supabase
        .from('progress')
        .select('lesson_id, status')
        .eq('user_id', user.id)
        .in('lesson_id', lessonIds)
    : { data: [] }

  const progressMap = new Map<string, LessonStatus>(
    (progressRows ?? []).map((p: any) => [p.lesson_id, p.status as LessonStatus])
  )

  // Progresso da aula atual
  const { data: currentProgress } = await supabase
    .from('progress')
    .select('status')
    .eq('user_id', user.id)
    .eq('lesson_id', params.lessonId)
    .maybeSingle()

  const initialStatus: LessonStatus = (currentProgress?.status as LessonStatus) ?? 'not_started'

  // Comentários da aula
  const { data: commentsRaw } = await supabase
    .from('comments')
    .select('id, user_id, content, created_at, user:profiles(name, avatar_url)')
    .eq('lesson_id', params.lessonId)
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Lista plana de aulas para navegação prev/next
  const isLinear = course?.trail_type === 'linear'
  let foundIncomplete = false

  const allLessons = (modules ?? []).flatMap((mod: any) =>
    (mod.lessons ?? []).map((l: any) => {
      const status: LessonStatus = progressMap.get(l.id) ?? 'not_started'
      const isDone = status === 'completed'
      const locked = !!enrollment && isLinear && foundIncomplete && !l.is_free_preview
      if (!isDone && !locked) foundIncomplete = true
      return { ...l, status, locked, moduleTitle: mod.title }
    })
  )

  const currentIndex = allLessons.findIndex((l: any) => l.id === params.lessonId)
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null

  return (
    <div className="flex flex-col lg:flex-row gap-0 min-h-0">
      {/* Main content */}
      <div className="flex-1 min-w-0 p-4 md:p-6 lg:p-8 space-y-6 min-w-0 overflow-x-hidden">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <Link
            href={`/courses/${courseId}`}
            className="flex items-center gap-1 hover:text-[var(--text)] transition-colors"
          >
            <ArrowLeft size={14} />
            {course?.title ?? 'Curso'}
          </Link>
          <span>/</span>
          <span className="text-[var(--text)] font-medium truncate">{lesson.title}</span>
        </div>

        {/* Lesson title */}
        <div>
          <h1 className="text-xl md:text-2xl font-black text-[var(--text)] tracking-tight">
            {lesson.title}
          </h1>
          {lesson.description && (
            <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">
              {lesson.description}
            </p>
          )}
        </div>

        {/* Player */}
        <LessonPlayer
          lessonId={params.lessonId}
          userId={user.id}
          title={lesson.title}
          contentType={lesson.content_type as ContentType}
          contentUrl={lesson.content_url}
          initialStatus={initialStatus}
          allowDownload={lesson.allow_download ?? true}
        />

        {/* Comentários */}
        <LessonComments
          lessonId={params.lessonId}
          userId={user.id}
          userRole={userProfile?.role ?? 'aluno'}
          initialComments={(commentsRaw ?? []) as any}
        />

        {/* Prev / Next navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
          {prevLesson ? (
            <Link
              href={`/courses/${courseId}/learn/${prevLesson.id}`}
              className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            >
              <ArrowLeft size={15} />
              <span className="hidden sm:inline truncate max-w-[160px]">{prevLesson.title}</span>
              <span className="sm:hidden">Anterior</span>
            </Link>
          ) : (
            <div />
          )}

          {nextLesson && !nextLesson.locked ? (
            <Link
              href={`/courses/${courseId}/learn/${nextLesson.id}`}
              className="flex items-center gap-2 text-sm font-medium text-[var(--green)] hover:opacity-80 transition-opacity"
            >
              <span className="hidden sm:inline truncate max-w-[160px]">{nextLesson.title}</span>
              <span className="sm:hidden">Próxima</span>
              <ArrowRight size={15} />
            </Link>
          ) : nextLesson?.locked ? (
            <span className="flex items-center gap-2 text-sm text-[var(--muted)] opacity-50">
              <Lock size={13} />
              Bloqueada
            </span>
          ) : (
            <Link
              href={`/courses/${courseId}`}
              className="flex items-center gap-2 text-sm font-medium text-[var(--blue)] hover:opacity-80 transition-opacity"
            >
              Ver curso
              <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </div>

      {/* Sidebar — lesson list */}
      <LessonSidebarDrawer>
        <div className="p-4 border-b border-[var(--border)] hidden lg:block">
          <h2 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
            Conteúdo do curso
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
          {(modules ?? []).map((mod: any) => (
            <details key={mod.id} open>
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 list-none">
                <span className="text-xs font-semibold text-[var(--text)] uppercase tracking-wide">
                  {mod.title}
                </span>
                <ChevronDown size={14} className="text-[var(--muted)]" />
              </summary>

              <ul className="pb-1">
                {(mod.lessons ?? []).map((l: any) => {
                  const lessonStatus: LessonStatus = progressMap.get(l.id) ?? 'not_started'
                  const isCurrentLesson = l.id === params.lessonId
                  const lessonLocked = !!enrollment && isLinear &&
                    allLessons.find((al: any) => al.id === l.id)?.locked

                  return (
                    <li key={l.id}>
                      {lessonLocked ? (
                        <div className="flex items-center gap-3 px-4 py-2.5 opacity-40 cursor-not-allowed">
                          <Lock size={13} className="shrink-0 text-[var(--muted)]" />
                          <span className="text-xs text-[var(--muted)] truncate">{l.title}</span>
                        </div>
                      ) : (
                        <Link
                          href={`/courses/${courseId}/learn/${l.id}`}
                          className={cn(
                            'flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/5',
                            isCurrentLesson && 'bg-[var(--green)]/10 border-l-2 border-[var(--green)]'
                          )}
                        >
                          {lessonStatus === 'completed' ? (
                            <CheckCircle size={13} className="shrink-0 text-[var(--green)]" />
                          ) : lessonStatus === 'in_progress' ? (
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--blue)] shrink-0 animate-pulse" />
                          ) : (
                            <Circle size={13} className="shrink-0 text-[var(--muted)]" />
                          )}
                          <span
                            className={cn(
                              'text-xs truncate',
                              isCurrentLesson ? 'text-[var(--text)] font-medium' : 'text-[var(--muted)]'
                            )}
                          >
                            {l.title}
                          </span>
                          {l.is_free_preview && !enrollment && (
                            <span className="ml-auto text-[10px] text-[var(--green)] font-bold shrink-0">
                              FREE
                            </span>
                          )}
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </details>
          ))}
        </div>
      </LessonSidebarDrawer>
    </div>
  )
}
