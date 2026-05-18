'use server'

import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'

export async function postComment(lessonId: string, content: string) {
  const trimmed = content.trim()
  if (!trimmed) return { error: 'Comentário vazio' }
  if (trimmed.length > 2000) return { error: 'Comentário muito longo' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data, error } = await supabase
    .from('comments')
    .insert({ lesson_id: lessonId, user_id: user.id, content: trimmed })
    .select('id, user_id, content, created_at, user:profiles(name, avatar_url)')
    .single()

  if (error) return { error: error.message }

  // Notifica o criador do curso (se não for ele mesmo comentando)
  const { data: lessonInfo } = await supabase
    .from('lessons')
    .select('title, module:modules(course:courses(id, title, creator_id))')
    .eq('id', lessonId)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const courseData = (lessonInfo?.module as any)?.course as { id: string; title: string; creator_id: string } | null
  if (courseData && courseData.creator_id !== user.id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commenterName = (data.user as any)?.name ?? 'Um aluno'
    await createNotification(supabase, {
      userId: courseData.creator_id,
      type:   'new_comment',
      title:  'Novo comentário',
      body:   `${commenterName} comentou em "${lessonInfo?.title}".`,
      link:   `/courses/${courseData.id}/learn/${lessonId}`,
    })
  }

  return { comment: data }
}

export async function deleteComment(commentId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('comments').delete().eq('id', commentId)
  if (error) return { error: error.message }
  return { ok: true }
}
