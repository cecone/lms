'use client'

import { Suspense } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou senha incorretos. Tente novamente.')
      setLoading(false)
      return
    }

    router.push(next)
    router.refresh()
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 shadow-xl">
      <h2 className="text-xl font-bold text-[var(--text)] mb-6">Entrar na plataforma</h2>

      {error && (
        <div
          role="alert"
          className="mb-4 px-4 py-3 rounded-lg bg-[var(--red)]/10 border border-[var(--red)]/30 text-sm text-[var(--red)]"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          id="email"
          type="email"
          label="Email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          autoFocus
        />
        <Input
          id="password"
          type="password"
          label="Senha"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
          Entrar
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        Não tem conta?{' '}
        <Link href="/register" className="text-[var(--green)] font-semibold hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 animate-pulse h-72" />
    }>
      <LoginForm />
    </Suspense>
  )
}
