'use server'

import { createClient } from '@/lib/supabase/server'

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
  return { comment: data }
}

export async function deleteComment(commentId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('comments').delete().eq('id', commentId)
  if (error) return { error: error.message }
  return { ok: true }
}
