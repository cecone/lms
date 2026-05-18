'use server'

import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function approveCourse(courseId: string) {
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('courses')
    .select('title, creator_id')
    .eq('id', courseId)
    .single()

  await supabase
    .from('courses')
    .update({ status: 'published', updated_at: new Date().toISOString() })
    .eq('id', courseId)

  if (course) {
    await createNotification(supabase, {
      userId: course.creator_id,
      type:   'course_approved',
      title:  'Curso aprovado!',
      body:   `"${course.title}" foi aprovado e está publicado.`,
      link:   `/courses/${courseId}`,
    })
  }

  revalidatePath('/admin')
  redirect('/admin')
}

export async function rejectCourse(courseId: string, note: string) {
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('courses')
    .select('title, creator_id')
    .eq('id', courseId)
    .single()

  await supabase
    .from('courses')
    .update({ status: 'draft', updated_at: new Date().toISOString() })
    .eq('id', courseId)

  if (course) {
    await createNotification(supabase, {
      userId: course.creator_id,
      type:   'course_rejected',
      title:  'Curso precisa de ajustes',
      body:   note ? `"${course.title}": ${note}` : `"${course.title}" foi devolvido para revisão.`,
      link:   `/studio/courses/${courseId}`,
    })
  }

  revalidatePath('/admin')
  redirect('/admin')
}
