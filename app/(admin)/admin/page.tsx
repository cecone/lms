import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShieldCheck, BookOpen, Clock, Users } from 'lucide-react'
import Link from 'next/link'

export default async function AdminPage() {
  const supabase = await createClient()

  const [
    { count: totalUsers },
    { count: totalCourses },
    { data: pendingCourses },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('courses').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('courses').select('*, creator:profiles(name)').eq('status', 'pending').limit(10),
  ])

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      <div className="mb-8 flex items-center gap-3">
        <ShieldCheck size={24} className="text-[var(--green)]" />
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Administração</h1>
          <p className="text-[var(--muted)] text-sm">Visão geral da plataforma</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        {[
          { label: 'Usuários',          value: totalUsers ?? 0,   icon: Users,    color: 'var(--blue)' },
          { label: 'Cursos publicados', value: totalCourses ?? 0, icon: BookOpen, color: 'var(--green)' },
          { label: 'Aguardando revisão', value: pendingCourses?.length ?? 0, icon: Clock, color: 'var(--amber)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
            <Icon size={18} style={{ color }} className="mb-3" />
            <p className="text-3xl font-bold text-[var(--text)]">{value}</p>
            <p className="text-xs text-[var(--muted)] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Cursos pendentes */}
      <section aria-labelledby="pending-heading">
        <h2 id="pending-heading" className="text-base font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
          <Clock size={16} className="text-[var(--amber)]" />
          Cursos aguardando aprovação
        </h2>

        {!pendingCourses || pendingCourses.length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 text-center text-sm text-[var(--muted)]">
            Nenhum curso aguardando aprovação.
          </div>
        ) : (
          <div className="space-y-3">
            {(pendingCourses as { id: string; title: string; accent_color: string; creator: { name: string } | null }[]).map((course) => (
              <div key={course.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center font-bold"
                  style={{ backgroundColor: course.accent_color + '22', color: course.accent_color }}
                >
                  {course.title[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[var(--text)] truncate">{course.title}</p>
                  <p className="text-xs text-[var(--muted)]">por {course.creator?.name}</p>
                </div>
                <Badge variant="amber">Pendente</Badge>
                <Link href={`/admin/courses/${course.id}/review`}>
                  <Button size="sm" variant="secondary">Revisar</Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
