'use server'

import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'
import { revalidatePath } from 'next/cache'

export async function enrollInCourse(courseId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('enrollments')
    .insert({ user_id: user.id, course_id: courseId })

  if (error) return { error: error.message }

  // Notifica o professor
  const { data: course } = await supabase
    .from('courses')
    .select('title, creator_id')
    .eq('id', courseId)
    .single()

  const { data: student } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  if (course && course.creator_id !== user.id) {
    await createNotification(supabase, {
      userId: course.creator_id,
      type:   'new_enrollment',
      title:  'Novo aluno matriculado',
      body:   `${student?.name ?? 'Um aluno'} se matriculou em "${course.title}".`,
      link:   `/studio/courses/${courseId}/analytics`,
    })
  }

  revalidatePath(`/courses/${courseId}`)
  return { ok: true }
}
