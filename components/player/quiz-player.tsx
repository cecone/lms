'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, XCircle, AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { submitQuizAttempt, type SubmitResult } from '@/app/actions/quiz'
import { cn } from '@/lib/utils'

interface QuizOption {
  id: string
  text: string
}

interface QuizQuestion {
  id: string
  text: string
  options: QuizOption[]
  explanation: string | null
}

interface QuizData {
  id: string
  questions: QuizQuestion[]
  passing_score: number
  max_attempts: number
}

interface QuizPlayerProps {
  lessonId: string
  onComplete: () => void
  completed?: boolean
}

export function QuizPlayer({ lessonId, onComplete, completed }: QuizPlayerProps) {
  const [loading, setLoading]     = useState(true)
  const [quiz, setQuiz]           = useState<QuizData | null>(null)
  const [attemptsUsed, setAttemptsUsed] = useState(0)
  const [answers, setAnswers]     = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult]       = useState<SubmitResult | null>(null)
  const [error, setError]         = useState<string | null>(null)

  const fetchQuiz = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/quiz/${lessonId}`)
      const data = await res.json()
      setQuiz(data.quiz)
      setAttemptsUsed(data.attemptsUsed ?? 0)
    } catch {
      setError('Erro ao carregar quiz')
    }
    setLoading(false)
  }, [lessonId])

  useEffect(() => { fetchQuiz() }, [fetchQuiz])

  async function handleSubmit() {
    if (!quiz) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await submitQuizAttempt(quiz.id, answers)
      setResult(res)
      setAttemptsUsed(res.attemptsUsed)
      if (res.passed) onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar')
    }
    setSubmitting(false)
  }

  function handleRetry() {
    setAnswers({})
    setResult(null)
    setError(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
        <div className="w-6 h-6 border-2 border-[var(--green)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!quiz || quiz.questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--muted)] text-sm">
        Quiz não configurado.
      </div>
    )
  }

  const attemptsLeft = quiz.max_attempts - attemptsUsed
  const canRetry     = attemptsLeft > 0
  const answeredAll  = quiz.questions.every(q => answers[q.id])

  /* ── Tela de resultado ── */
  if (result) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        {/* Cabeçalho do resultado */}
        <div className={cn(
          'px-5 py-4 flex items-center gap-3',
          result.passed
            ? 'bg-[var(--green)]/10 border-b border-[var(--green)]/30'
            : 'bg-amber-500/10 border-b border-amber-500/30'
        )}>
          {result.passed
            ? <CheckCircle size={20} className="text-[var(--green)] shrink-0" />
            : <XCircle    size={20} className="text-amber-400 shrink-0" />}
          <div className="flex-1">
            <p className={cn('font-semibold text-sm', result.passed ? 'text-[var(--green)]' : 'text-amber-400')}>
              {result.passed ? 'Parabéns! Você passou!' : 'Não foi dessa vez'}
            </p>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {result.correct}/{result.total} corretas · {Math.round(result.score)}% · Mínimo: {quiz.passing_score}%
            </p>
          </div>
          {!result.passed && canRetry && (
            <Button size="sm" variant="secondary" onClick={handleRetry} className="gap-1.5 shrink-0">
              <RotateCcw size={13} />Tentar novamente
            </Button>
          )}
        </div>

        {/* Revisão por pergunta */}
        <div className="divide-y divide-[var(--border)]">
          {quiz.questions.map((q, idx) => {
            const chosen  = answers[q.id]
            const correct = result.correctAnswers[q.id]
            const isRight = chosen === correct
            return (
              <div key={q.id} className="px-5 py-4">
                <div className="flex items-start gap-2 mb-3">
                  {isRight
                    ? <CheckCircle size={15} className="text-[var(--green)] shrink-0 mt-0.5" />
                    : <XCircle    size={15} className="text-red-400 shrink-0 mt-0.5" />}
                  <p className="text-sm text-[var(--text)]">
                    <span className="text-[var(--muted)] mr-1">{idx + 1}.</span>{q.text}
                  </p>
                </div>
                <div className="ml-5 space-y-1.5">
                  {q.options.map(opt => (
                    <div
                      key={opt.id}
                      className={cn(
                        'text-xs px-3 py-2 rounded-lg border',
                        opt.id === correct
                          ? 'border-[var(--green)]/40 bg-[var(--green)]/10 text-[var(--green)]'
                          : opt.id === chosen && !isRight
                          ? 'border-red-400/40 bg-red-400/10 text-red-400'
                          : 'border-transparent text-[var(--muted)]'
                      )}
                    >
                      {opt.text}
                      {opt.id === correct && <span className="ml-1 font-semibold">✓</span>}
                      {opt.id === chosen && !isRight && <span className="ml-1">✗</span>}
                    </div>
                  ))}
                </div>
                {result.explanations[q.id] && (
                  <p className="ml-5 mt-2 text-xs text-[var(--muted)] italic">
                    {result.explanations[q.id]}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {!result.passed && !canRetry && (
          <div className="px-5 py-3 border-t border-[var(--border)] text-xs text-[var(--muted)] text-center">
            Limite de {quiz.max_attempts} tentativa{quiz.max_attempts !== 1 ? 's' : ''} atingido.
          </div>
        )}
      </div>
    )
  }

  /* ── Quiz ativo (e re-tentativa mesmo se já concluído) ── */
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Banner de concluído (não bloqueia interação) */}
      {completed && (
        <div className="flex items-center gap-2 px-5 py-2.5 bg-[var(--green)]/10 border-b border-[var(--green)]/20 text-[var(--green)]">
          <CheckCircle size={14} />
          <span className="text-xs font-medium">Quiz já concluído — você pode refazer abaixo</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
        <span className="text-xs text-[var(--muted)] uppercase tracking-wide">Quiz</span>
        <span className="text-xs text-[var(--muted)]">
          {quiz.questions.length} pergunta{quiz.questions.length !== 1 ? 's' : ''} · mín. {quiz.passing_score}% · {attemptsLeft} tentativa{attemptsLeft !== 1 ? 's' : ''} restante{attemptsLeft !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Perguntas */}
      <div className="divide-y divide-[var(--border)]">
        {quiz.questions.map((q, idx) => (
          <div key={q.id} className="px-5 py-4">
            <p className="text-sm font-medium text-[var(--text)] mb-3">
              <span className="text-[var(--muted)] mr-1">{idx + 1}.</span>{q.text}
            </p>
            <div className="space-y-2">
              {q.options.map(opt => {
                const selected = answers[q.id] === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAnswers(a => ({ ...a, [q.id]: opt.id }))}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left cursor-pointer transition-all text-sm',
                      selected
                        ? 'border-[var(--green)] bg-[var(--green)]/10 text-[var(--text)]'
                        : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--green)]/40 hover:text-[var(--text)]'
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded-full border-2 shrink-0 transition-all',
                      selected ? 'border-[var(--green)] bg-[var(--green)]' : 'border-current'
                    )} />
                    {opt.text}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Rodapé */}
      <div className="px-5 py-3 border-t border-[var(--border)] flex items-center gap-3">
        {error && (
          <span className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle size={13} />{error}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {!answeredAll && (
            <span className="text-xs text-[var(--muted)]">
              {quiz.questions.filter(q => answers[q.id]).length}/{quiz.questions.length} respondidas
            </span>
          )}
          <Button
            size="sm"
            disabled={!answeredAll}
            loading={submitting}
            onClick={handleSubmit}
          >
            Enviar respostas
          </Button>
        </div>
      </div>
    </div>
  )
}
