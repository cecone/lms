'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ── Curso ──────────────────────────────────────────────

export async function createCourse(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('courses')
    .insert({
      title:           formData.get('title') as string,
      description:     (formData.get('description') as string) || null,
      trail_type:      (formData.get('trail_type') as string) || 'linear',
      accent_color:    (formData.get('accent_color') as string) || '#4ADE80',
      estimated_hours: formData.get('estimated_hours') ? Number(formData.get('estimated_hours')) : null,
      creator_id:      user.id,
      status:          'draft',
    })
    .select('id')
    .single()

  if (error || !data) throw new Error('Erro ao criar curso')
  redirect(`/studio/courses/${data.id}`)
}

export async function updateCourseDetails(courseId: string, data: {
  title: string
  description: string
  trail_type: string
  accent_color: string
  estimated_hours: string
}) {
  const supabase = await createClient()
  await supabase.from('courses').update({
    title:           data.title,
    description:     data.description || null,
    trail_type:      data.trail_type,
    accent_color:    data.accent_color,
    estimated_hours: data.estimated_hours ? Number(data.estimated_hours) : null,
    updated_at:      new Date().toISOString(),
  }).eq('id', courseId)
  revalidatePath(`/studio/courses/${courseId}`)
}

export async function updateCourseStatus(courseId: string, status: string) {
  const supabase = await createClient()
  await supabase.from('courses').update({ status, updated_at: new Date().toISOString() }).eq('id', courseId)
  revalidatePath(`/studio/courses/${courseId}`)
}

// ── Módulos ────────────────────────────────────────────

export async function addModule(courseId: string) {
  const supabase = await createClient()
  const { data: last } = await supabase
    .from('modules')
    .select('order')
    .eq('course_id', courseId)
    .order('order', { ascending: false })
    .limit(1)
    .single()

  await supabase.from('modules').insert({
    course_id: courseId,
    title:     'Novo módulo',
    order:     (last?.order ?? 0) + 1,
  })
  revalidatePath(`/studio/courses/${courseId}`)
}

export async function updateModule(moduleId: string, courseId: string, title: string) {
  const supabase = await createClient()
  await supabase.from('modules').update({ title }).eq('id', moduleId)
  revalidatePath(`/studio/courses/${courseId}`)
}

export async function deleteModule(moduleId: string, courseId: string) {
  const supabase = await createClient()
  await supabase.from('modules').delete().eq('id', moduleId)
  revalidatePath(`/studio/courses/${courseId}`)
}

export async function moveModule(moduleId: string, courseId: string, direction: 'up' | 'down') {
  const supabase = await createClient()
  const { data: modules } = await supabase
    .from('modules')
    .select('id, order')
    .eq('course_id', courseId)
    .order('order')

  if (!modules) return
  const idx = modules.findIndex(m => m.id === moduleId)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= modules.length) return

  const a = modules[idx], b = modules[swapIdx]
  await Promise.all([
    supabase.from('modules').update({ order: b.order }).eq('id', a.id),
    supabase.from('modules').update({ order: a.order }).eq('id', b.id),
  ])
  revalidatePath(`/studio/courses/${courseId}`)
}

// ── Aulas ──────────────────────────────────────────────

export async function addLesson(moduleId: string, courseId: string) {
  const supabase = await createClient()
  const { data: last } = await supabase
    .from('lessons')
    .select('order')
    .eq('module_id', moduleId)
    .order('order', { ascending: false })
    .limit(1)
    .single()

  await supabase.from('lessons').insert({
    module_id:    moduleId,
    title:        'Nova aula',
    content_type: 'video',
    order:        (last?.order ?? 0) + 1,
  })
  revalidatePath(`/studio/courses/${courseId}`)
}

export async function updateLesson(lessonId: string, courseId: string, data: {
  title: string
  description: string
  content_type: string
  content_url: string
  duration_seconds: string
  is_free_preview: boolean
  allow_download: boolean
}) {
  const supabase = await createClient()
  await supabase.from('lessons').update({
    title:            data.title,
    description:      data.description || null,
    content_type:     data.content_type,
    content_url:      data.content_url || null,
    duration_seconds: data.duration_seconds ? Number(data.duration_seconds) : null,
    is_free_preview:  data.is_free_preview,
    allow_download:   data.allow_download,
  }).eq('id', lessonId)
  revalidatePath(`/studio/courses/${courseId}`)
}

export async function deleteLesson(lessonId: string, courseId: string) {
  const supabase = await createClient()
  await supabase.from('lessons').delete().eq('id', lessonId)
  revalidatePath(`/studio/courses/${courseId}`)
}

// ── Quiz ───────────────────────────────────────────────

interface QuizQuestion {
  id: string
  text: string
  options: { id: string; text: string }[]
  correct_option_id: string
  explanation: string | null
}

export async function saveQuiz(
  lessonId: string,
  courseId: string,
  data: { questions: QuizQuestion[]; passing_score: number; max_attempts: number }
) {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('quizzes')
    .select('id')
    .eq('lesson_id', lessonId)
    .single()

  if (existing) {
    await supabase.from('quizzes').update({
      questions:     data.questions,
      passing_score: data.passing_score,
      max_attempts:  data.max_attempts,
    }).eq('id', existing.id)
  } else {
    await supabase.from('quizzes').insert({
      lesson_id:     lessonId,
      questions:     data.questions,
      passing_score: data.passing_score,
      max_attempts:  data.max_attempts,
    })
  }
  revalidatePath(`/studio/courses/${courseId}`)
}

export async function moveLesson(lessonId: string, moduleId: string, courseId: string, direction: 'up' | 'down') {
  const supabase = await createClient()
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, order')
    .eq('module_id', moduleId)
    .order('order')

  if (!lessons) return
  const idx = lessons.findIndex(l => l.id === lessonId)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= lessons.length) return

  const a = lessons[idx], b = lessons[swapIdx]
  await Promise.all([
    supabase.from('lessons').update({ order: b.order }).eq('id', a.id),
    supabase.from('lessons').update({ order: a.order }).eq('id', b.id),
  ])
  revalidatePath(`/studio/courses/${courseId}`)
}
