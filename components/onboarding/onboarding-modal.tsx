'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding } from '@/app/actions/onboarding'
import { Zap, Flame, BookOpen, Trophy, ArrowRight, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  name: string
}

const STEPS = [
  {
    id: 'welcome',
    icon: <span className="text-5xl">👋</span>,
    title: (name: string) => `Olá, ${name.split(' ')[0]}!`,
    content: () => (
      <p className="text-[var(--muted)] text-sm leading-relaxed text-center">
        Bem-vindo ao <span className="font-bold text-[var(--green)]">learn·studio</span> — sua plataforma de aprendizado.
        Aqui você acessa cursos, acompanha seu progresso e evolui no seu ritmo.
      </p>
    ),
  },
  {
    id: 'gamification',
    icon: <Zap size={48} className="text-[var(--amber)]" />,
    title: () => 'XP e Streak',
    content: () => (
      <div className="space-y-3 w-full">
        {[
          { icon: <Zap size={16} className="text-[var(--amber)]" />, label: 'XP', desc: 'Ganhe pontos completando aulas e suba de nível.' },
          { icon: <Flame size={16} className="text-orange-400" />, label: 'Streak', desc: 'Acesse a plataforma todos os dias para manter sua sequência.' },
          { icon: <Trophy size={16} className="text-[var(--green)]" />, label: 'Ranking', desc: 'Compare seu desempenho com outros alunos no ranking.' },
        ].map(({ icon, label, desc }) => (
          <div key={label} className="flex items-start gap-3 bg-[var(--bg)] rounded-xl p-3">
            <div className="mt-0.5 shrink-0">{icon}</div>
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">{label}</p>
              <p className="text-xs text-[var(--muted)] leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'courses',
    icon: <BookOpen size={48} className="text-[var(--blue)]" />,
    title: () => 'Comece a aprender',
    content: () => (
      <p className="text-[var(--muted)] text-sm leading-relaxed text-center">
        Explore o catálogo de cursos, matricule-se gratuitamente e acompanhe seu progresso aula a aula.
        Ao concluir um curso, você recebe um <span className="font-semibold text-[var(--text)]">certificado</span> verificável.
      </p>
    ),
  },
]

export function OnboardingModal({ name }: Props) {
  const [step, setStep] = useState(0)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  function handleNext() {
    if (isLast) {
      startTransition(async () => {
        await completeOnboarding()
        router.push('/courses')
      })
    } else {
      setStep((s) => s + 1)
    }
  }

  function handleSkip() {
    startTransition(async () => {
      await completeOnboarding()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl">

        {/* Progress bar */}
        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-[var(--green)] transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="px-8 py-8 flex flex-col items-center gap-5">
          {/* Icon */}
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-[var(--bg)]">
            {current.icon}
          </div>

          {/* Title */}
          <h2 className="text-xl font-black text-[var(--text)] text-center">
            {current.title(name)}
          </h2>

          {/* Body */}
          <div className="w-full">
            {current.content()}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 flex items-center justify-between gap-3">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-full transition-all',
                  i === step
                    ? 'w-4 h-2 bg-[var(--green)]'
                    : i < step
                    ? 'w-2 h-2 bg-[var(--green)]/50'
                    : 'w-2 h-2 bg-white/20'
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isLast && (
              <button
                onClick={handleSkip}
                disabled={pending}
                className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors px-2 py-1.5"
              >
                Pular
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={pending}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--green)] text-[#0D1A0D] rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLast ? (
                <>
                  <CheckCircle size={15} />
                  Explorar cursos
                </>
              ) : (
                <>
                  Próximo
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
