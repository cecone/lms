import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from './profile-form'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: profile },
    { data: xp },
    { count: enrolledCount },
    { count: completedCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('user_xp').select('total_xp, level, streak_days').eq('user_id', user.id).single(),
    supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('progress').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'completed'),
  ])

  if (!profile) redirect('/login')

  return (
    <div className="p-6 md:p-10 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text)]">Meu perfil</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Gerencie suas informações pessoais</p>
      </div>

      <ProfileForm
        profile={profile}
        xp={xp}
        enrolledCount={enrolledCount ?? 0}
        completedCount={completedCount ?? 0}
        supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
      />
    </div>
  )
}
