/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ModuleList } from '@/components/courses/module-list'
import { EnrollButton } from '@/components/courses/enroll-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, Users, PlayCircle, ArrowLeft, Award } from 'lucide-react'
import { formatDuration } from '@/lib/utils'
import type { LessonStatus, ContentType } from '@/types/database'

export default async function CourseDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Busca curso + criador
  const { data: course } = await supabase
    .from('courses')
    .select('*, creator:profiles(name, avatar_url)')
    .eq('id', params.id)
    .single()

  if (!course) notFound()

  // Matrícula do usuário
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id, completed_at')
    .eq('user_id', user.id)
    .eq('course_id', params.id)
    .maybeSingle()

  const enrolled = !!enrollment

  // Módulos + aulas
  const { data: modules } = await supabase
    .from('modules')
    .select('*, lessons(*)')
    .eq('course_id', params.id)
    .order('order')
    .order('order', { referencedTable: 'lessons' })

  // Progresso do usuário em todas as aulas deste curso
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

  // Conta alunos matriculados
  const { count: studentsCount } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', params.id)

  // Verifica se há certificado emitido
  const { data: certificate } = await supabase
    .from('certificates')
    .select('verification_code')
    .eq('user_id', user.id)
    .eq('course_id', params.id)
    .maybeSingle()

  // Progresso geral do curso
  const totalLessons = lessonIds.length
  const completedLessons = Array.from(progressMap.values()).filter((s) => s === 'completed').length
  const progressPct = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100)

  // Monta módulos com progresso e lógica de bloqueio (linear)
  const isLinear = course.trail_type === 'linear'
  let foundIncomplete = false

  const modulesWithProgress = (modules ?? []).map((mod: any) => {
    const lessons = (mod.lessons ?? []).map((lesson: any) => {
      const status: LessonStatus = progressMap.get(lesson.id) ?? 'not_started'
      const isDone = status === 'completed'

      // Bloqueio linear: trava após a primeira aula não completa
      const locked = enrolled && isLinear && foundIncomplete && !lesson.is_free_preview
      if (!isDone && !locked) foundIncomplete = true

      return {
        id: lesson.id,
        title: lesson.title,
        order: lesson.order,
        content_type: lesson.content_type as ContentType,
        duration_seconds: lesson.duration_seconds,
        is_free_preview: lesson.is_free_preview,
        status,
        locked,
      }
    })
    return { id: mod.id, title: mod.title, order: mod.order, lessons }
  })

  // Próxima aula (primeira não completa)
  const nextLesson = modulesWithProgress
    .flatMap((m: any) => m.lessons)
    .find((l: any) => l.status !== 'completed' && !l.locked)

  const totalDuration = (modules ?? []).flatMap((m: any) => m.lessons ?? [])
    .reduce((acc: number, l: any) => acc + (l.duration_seconds ?? 0), 0)

  const creator = course.creator as { name: string; avatar_url: string | null } | null

  return (
    <div className="max-w-4xl p-6 md:p-10">
      {/* Back */}
      <Link href="/courses" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--text)] mb-6 transition-colors">
        <ArrowLeft size={15} />
        Todos os cursos
      </Link>

      {/* Hero */}
      <div
        className="rounded-2xl p-8 mb-8 flex flex-col gap-4"
        style={{ backgroundColor: course.accent_color + '18', borderColor: course.accent_color + '44', border: '1px solid' }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="green">{course.trail_type}</Badge>
          {enrollment?.completed_at && <Badge variant="blue">Concluído</Badge>}
        </div>

        <h1 className="text-2xl md:text-3xl font-black text-[var(--text)] tracking-tight">
          {course.title}
        </h1>

        {course.description && (
          <p className="text-[var(--muted)] text-sm leading-relaxed max-w-2xl">
            {course.description}
          </p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-5 text-sm text-[var(--muted)]">
          {creator && (
            <span className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold">
                {creator.name[0]}
              </div>
              {creator.name}
            </span>
          )}
          {totalDuration > 0 && (
            <span className="flex items-center gap-1">
              <Clock size={13} />
              {formatDuration(totalDuration)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users size={13} />
            {studentsCount ?? 0} alunos
          </span>
        </div>

        {/* Barra de progresso — só para matriculados */}
        {enrolled && totalLessons > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[var(--muted)]">
              <span>{completedLessons} de {totalLessons} aulas concluídas</span>
              <span style={{ color: progressPct === 100 ? 'var(--green)' : undefined }}>
                {progressPct}%
              </span>
            </div>
            <div className="h-2 bg-black/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: progressPct === 100 ? 'var(--green)' : course.accent_color,
                }}
              />
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-2">
          {!enrolled ? (
            <EnrollButton courseId={params.id} userId={user.id} />
          ) : nextLesson ? (
            <Link href={`/courses/${params.id}/learn/${nextLesson.id}`}>
              <Button size="lg" className="gap-2">
                <PlayCircle size={17} />
                {progressMap.size > 0 ? 'Continuar' : 'Começar'}
              </Button>
            </Link>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" variant="secondary" className="gap-2" disabled>
                <PlayCircle size={17} />
                Curso concluído
              </Button>
              {certificate && (
                <Link href={`/courses/${params.id}/certificate`}>
                  <Button size="lg" className="gap-2">
                    <Award size={17} />
                    Ver certificado
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Módulos */}
      <section aria-labelledby="modules-heading">
        <h2 id="modules-heading" className="text-base font-bold text-[var(--text)] mb-4">
          Conteúdo do curso
        </h2>
        <ModuleList
          courseId={params.id}
          modules={modulesWithProgress}
          enrolled={enrolled}
        />
      </section>
    </div>
  )
}
