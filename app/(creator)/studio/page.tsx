import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PenSquare, Plus, Eye, BarChart2 } from 'lucide-react'
import Link from 'next/link'

const STATUS_LABELS: Record<string, { label: string; variant: 'muted' | 'amber' | 'green' | 'blue' }> = {
  draft:     { label: 'Rascunho',   variant: 'muted' },
  pending:   { label: 'Em revisão', variant: 'amber' },
  published: { label: 'Publicado',  variant: 'green' },
  archived:  { label: 'Arquivado',  variant: 'muted' },
}

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green)] ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]'

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
      {/* Header */}
      <header className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[26px] leading-tight font-medium tracking-tight text-[var(--text)] flex items-center gap-2">
            <PenSquare size={22} className="text-[var(--green)]" aria-hidden />
            Meu studio
          </h1>
          <p className="text-[var(--muted)] mt-1 text-sm">Gerencie seus cursos e conteúdos</p>
        </div>
        <Link href="/studio/courses/new" className={`rounded-md shrink-0 ${focusRing}`}>
          <Button size="sm" className="gap-2">
            <Plus size={15} />
            Novo curso
          </Button>
        </Link>
      </header>

      {!courses || courses.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--green)]/15 flex items-center justify-center mx-auto mb-4">
            <PenSquare size={24} className="text-[var(--green)]" aria-hidden />
          </div>
          <p className="text-[var(--muted)] text-sm mb-4 max-w-xs mx-auto">
            Você ainda não criou nenhum curso. Comece pelo primeiro.
          </p>
          <Link href="/studio/courses/new" className={`inline-block rounded-md ${focusRing}`}>
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
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4 hover:border-[var(--border-strong)] transition-colors"
              >
                <div
                  className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center text-lg font-medium"
                  style={{ backgroundColor: course.accent_color + '22', color: course.accent_color }}
                >
                  {course.title[0]}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="font-medium text-sm text-[var(--text)] truncate">{course.title}</h2>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <p className="text-xs text-[var(--muted)] truncate">{course.description ?? 'Sem descrição'}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/courses/${course.id}`} className={`rounded-md ${focusRing}`}>
                    <Button variant="ghost" size="sm" aria-label="Visualizar curso">
                      <Eye size={15} />
                    </Button>
                  </Link>
                  <Link href={`/studio/courses/${course.id}/analytics`} className={`rounded-md ${focusRing}`}>
                    <Button variant="ghost" size="sm" aria-label="Ver analytics">
                      <BarChart2 size={15} />
                    </Button>
                  </Link>
                  <Link href={`/studio/courses/${course.id}`} className={`rounded-md ${focusRing}`}>
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
