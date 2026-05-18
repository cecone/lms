'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function approveCourse(courseId: string) {
  const supabase = await createClient()
  await supabase
    .from('courses')
    .update({ status: 'published', updated_at: new Date().toISOString() })
    .eq('id', courseId)
  revalidatePath('/admin')
  redirect('/admin')
}

export async function rejectCourse(courseId: string, note: string) {
  const supabase = await createClient()
  await supabase
    .from('courses')
    .update({ status: 'draft', updated_at: new Date().toISOString() })
    .eq('id', courseId)
  revalidatePath('/admin')
  redirect('/admin')
}
