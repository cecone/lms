import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PenSquare, Plus, Eye, BarChart2 } from 'lucide-react'
import Link from 'next/link'

const STATUS_LABELS: Record<string, { label: string; variant: 'muted' | 'amber' | 'green' | 'blue' }> = {
  draft:     { label: 'Rascunho',    variant: 'muted' },
  pending:   { label: 'Em revisão',  variant: 'amber' },
  published: { label: 'Publicado',   variant: 'green' },
  archived:  { label: 'Arquivado',   variant: 'muted' },
}

export default async function StudioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .eq('creator_id', user.id)
    .order('updated_at', { ascending: false })

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)] flex items-center gap-2">
            <PenSquare size={22} className="text-[var(--green)]" />
            Meu Studio
          </h1>
          <p className="text-[var(--muted)] mt-1 text-sm">Gerencie seus cursos e conteúdos</p>
        </div>
        <Link href="/studio/courses/new">
          <Button size="sm" className="gap-2">
            <Plus size={15} />
            Novo curso
          </Button>
        </Link>
      </div>

      {!courses || courses.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-16 text-center">
          <PenSquare size={40} className="mx-auto mb-4 text-[var(--muted)]" />
          <p className="text-[var(--muted)] mb-4">Você ainda não criou nenhum curso.</p>
          <Link href="/studio/courses/new">
            <Button>Criar primeiro curso</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(courses as { id: string; title: string; description: string | null; accent_color: string; status: string }[]).map((course) => {
            const status = STATUS_LABELS[course.status] ?? STATUS_LABELS.draft
            return (
              <div
                key={course.id}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4 hover:border-[var(--muted)] transition-colors"
              >
                <div
                  className="w-14 h-14 rounded-lg flex-shrink-0 flex items-center justify-center text-lg font-bold"
                  style={{ backgroundColor: course.accent_color + '22', color: course.accent_color }}
                >
                  {course.title[0]}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="font-semibold text-sm text-[var(--text)] truncate">{course.title}</h2>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <p className="text-xs text-[var(--muted)] truncate">{course.description ?? 'Sem descrição'}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href={`/courses/${course.id}`}>
                    <Button variant="ghost" size="sm" aria-label="Visualizar">
                      <Eye size={15} />
                    </Button>
                  </Link>
                  <Link href={`/studio/courses/${course.id}/analytics`}>
                    <Button variant="ghost" size="sm" aria-label="Analytics">
                      <BarChart2 size={15} />
                    </Button>
                  </Link>
                  <Link href={`/studio/courses/${course.id}`}>
                    <Button variant="secondary" size="sm">
                      Editar
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
