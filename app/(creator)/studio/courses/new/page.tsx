'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createCourse } from '../[id]/actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ArrowLeft, PenSquare } from 'lucide-react'

const ACCENT_COLORS = [
  { value: '#4ADE80', label: 'Verde' },
  { value: '#7EB8F7', label: 'Azul' },
  { value: '#FBBF24', label: 'Âmbar' },
  { value: '#F87171', label: 'Vermelho' },
  { value: '#C084FC', label: 'Roxo' },
  { value: '#FB923C', label: 'Laranja' },
]

const TRAIL_TYPES = [
  { value: 'linear',    label: 'Linear — aulas desbloqueadas em sequência' },
  { value: 'nonlinear', label: 'Livre — aluno escolhe a ordem' },
  { value: 'adaptive',  label: 'Adaptativo — baseado em desempenho' },
]

export default function NewCoursePage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await createCourse(formData)
    })
  }

  return (
    <div className="p-6 md:p-10 max-w-2xl">
      <Link
        href="/studio"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--text)] mb-6 transition-colors"
      >
        <ArrowLeft size={15} />
        Meu Studio
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <PenSquare size={22} className="text-[var(--green)]" />
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Novo curso</h1>
          <p className="text-[var(--muted)] text-sm mt-0.5">Preencha as informações básicas para começar</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          id="title"
          name="title"
          label="Título do curso *"
          placeholder="Ex: Introdução ao React"
          required
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-sm font-medium text-[var(--text)]">
            Descrição
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="Descreva o que o aluno vai aprender..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)] transition-colors focus:outline-none focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)] resize-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="trail_type" className="text-sm font-medium text-[var(--text)]">
            Tipo de trilha
          </label>
          <select
            id="trail_type"
            name="trail_type"
            defaultValue="linear"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] transition-colors focus:outline-none focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)]"
          >
            {TRAIL_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[var(--text)]">Cor de destaque</label>
          <div className="flex gap-3">
            {ACCENT_COLORS.map(c => (
              <label key={c.value} className="cursor-pointer">
                <input type="radio" name="accent_color" value={c.value} defaultChecked={c.value === '#4ADE80'} className="sr-only peer" />
                <div
                  className="w-8 h-8 rounded-full ring-2 ring-transparent peer-checked:ring-white peer-checked:ring-offset-2 peer-checked:ring-offset-[var(--bg)] transition-all"
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              </label>
            ))}
          </div>
        </div>

        <Input
          id="estimated_hours"
          name="estimated_hours"
          label="Duração estimada (horas)"
          type="number"
          min="0"
          step="0.5"
          placeholder="Ex: 4.5"
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={pending}>
            Criar curso
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
