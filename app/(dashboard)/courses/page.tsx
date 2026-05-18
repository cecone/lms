import { createClient } from '@/lib/supabase/server'
import { CoursesCatalog } from './courses-catalog'

export default async function CoursesPage() {
  const supabase = await createClient()

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, description, accent_color, thumbnail_url, estimated_hours, trail_type, created_at, creator:profiles(name)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)]">Explorar Cursos</h1>
        <p className="text-[var(--muted)] mt-1 text-sm">Encontre o próximo curso para evoluir</p>
      </div>

      <CoursesCatalog courses={(courses ?? []) as never} />
    </div>
  )
}
