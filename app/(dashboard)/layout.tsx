import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'
import type { Profile } from '@/types/database'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  if (!profile) redirect('/login')

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Skip link para acessibilidade */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--green)] focus:text-[#0D1A0D] focus:rounded-lg focus:font-semibold"
      >
        Pular para o conteúdo
      </a>

      <Sidebar
        role={profile.role}
        name={profile.name}
        email={profile.email}
        avatarUrl={profile.avatar_url}
      />

      <main
        id="main-content"
        className="md:ml-[var(--sidebar-w)] pb-20 md:pb-0 min-h-screen"
        tabIndex={-1}
      >
        {children}
      </main>

      <BottomNav role={profile.role} />
    </div>
  )
}
