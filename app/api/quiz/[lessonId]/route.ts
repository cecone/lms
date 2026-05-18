import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: { lessonId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id, questions, passing_score, max_attempts')
    .eq('lesson_id', params.lessonId)
    .single()

  if (!quiz) return NextResponse.json({ quiz: null, attemptsUsed: 0 })

  const { count } = await supabase
    .from('quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', quiz.id)
    .eq('user_id', user.id)

  return NextResponse.json({ quiz, attemptsUsed: count ?? 0 })
}
