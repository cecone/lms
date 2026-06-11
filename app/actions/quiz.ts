'use server'

import { createClient } from '@/lib/supabase/server'

interface QuizQuestion {
  id: string
  correct_option_id: string
  explanation?: string | null
}

export interface SubmitResult {
  score: number
  passed: boolean
  correct: number
  total: number
  correctAnswers: Record<string, string>
  explanations: Record<string, string | null>
  attemptsUsed: number
  maxAttempts: number
}

export async function submitQuizAttempt(
  quizId: string,
  answers: Record<string, string>
): Promise<SubmitResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('questions, passing_score, max_attempts')
    .eq('id', quizId)
    .single()

  if (!quiz) throw new Error('Quiz não encontrado')

  const { count } = await supabase
    .from('quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', quizId)
    .eq('user_id', user.id)

  if ((count ?? 0) >= quiz.max_attempts) {
    throw new Error('Limite de tentativas atingido')
  }

  const questions = quiz.questions as QuizQuestion[]
  let correct = 0
  const correctAnswers: Record<string, string> = {}
  const explanations: Record<string, string | null> = {}

  for (const q of questions) {
    correctAnswers[q.id] = q.correct_option_id
    explanations[q.id] = q.explanation ?? null
    if (answers[q.id] === q.correct_option_id) correct++
  }

  const score = questions.length > 0 ? (correct / questions.length) * 100 : 0
  const passed = score >= Number(quiz.passing_score)

  await supabase.from('quiz_attempts').insert({
    user_id: user.id,
    quiz_id: quizId,
    answers,
    score,
    passed,
  })

  return {
    score,
    passed,
    correct,
    total: questions.length,
    correctAnswers,
    explanations,
    attemptsUsed: (count ?? 0) + 1,
    maxAttempts: quiz.max_attempts,
  }
}
