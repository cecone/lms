import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'
import type { Profile } from '@/types/database'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  if (!profile || profile.role !== 'admin') redirect('/')

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Sidebar role={profile.role} name={profile.name} email={profile.email} avatarUrl={profile.avatar_url} userId={profile.id} />
      <main className="md:ml-[var(--sidebar-w)] pb-20 md:pb-0 min-h-screen">
        {children}
      </main>
      <BottomNav role={profile.role} />
    </div>
  )
}
