'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Role } from '@/types/database'

const ROLE_OPTIONS: { value: Extract<Role, 'aluno' | 'professor'>; label: string; desc: string }[] = [
  { value: 'aluno',     label: 'Aluno',   desc: 'Quero aprender e acompanhar cursos' },
  { value: 'professor', label: 'Criador', desc: 'Quero criar e publicar cursos' },
]

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'aluno' | 'professor'>('aluno')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 text-center">
        <div className="text-4xl mb-4" role="img" aria-label="Email enviado">📬</div>
        <h2 className="text-lg font-bold text-[var(--text)] mb-2">Confirme seu email</h2>
        <p className="text-sm text-[var(--muted)]">
          Enviamos um link de confirmação para{' '}
          <strong className="text-[var(--text)]">{email}</strong>.
          Verifique sua caixa de entrada.
        </p>
        <Link href="/login">
          <Button variant="secondary" className="mt-6 w-full">Ir para o login</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 shadow-xl">
      <h2 className="text-xl font-bold text-[var(--text)] mb-6">Criar conta</h2>

      {error && (
        <div role="alert" className="mb-4 px-4 py-3 rounded-lg bg-[var(--red)]/10 border border-[var(--red)]/30 text-sm text-[var(--red)]">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <fieldset>
          <legend className="text-sm font-medium text-[var(--text)] mb-2">Tipo de conta</legend>
          <div className="grid grid-cols-2 gap-3">
            {ROLE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  'flex flex-col gap-1 p-3 rounded-lg border cursor-pointer transition-colors',
                  role === opt.value
                    ? 'border-[var(--green)] bg-[var(--green)]/10'
                    : 'border-[var(--border)] hover:border-[var(--muted)]'
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value={opt.value}
                  checked={role === opt.value}
                  onChange={() => setRole(opt.value)}
                  className="sr-only"
                />
                <span className={cn('text-sm font-semibold', role === opt.value ? 'text-[var(--green)]' : 'text-[var(--text)]')}>
                  {opt.label}
                </span>
                <span className="text-xs text-[var(--muted)] leading-tight">{opt.desc}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <Input id="name" type="text" label="Nome completo" placeholder="Seu nome"
          value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" autoFocus />
        <Input id="email" type="email" label="Email" placeholder="seu@email.com"
          value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <Input id="password" type="password" label="Senha" placeholder="Mínimo 8 caracteres"
          value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />

        <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
          Criar conta
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        Já tem conta?{' '}
        <Link href="/login" className="text-[var(--green)] font-semibold hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  )
}
