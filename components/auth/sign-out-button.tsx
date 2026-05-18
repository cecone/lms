'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

export function SignOutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--red)] transition-colors px-3 py-2 rounded-lg hover:bg-[var(--red)]/10 w-full"
      aria-label="Sair da conta"
    >
      <LogOut size={15} />
      Sair
    </button>
  )
}
