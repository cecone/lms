'use client'

import { useState, useMemo } from 'react'
import { Search, X, Clock, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Course {
  id: string
  title: string
  description: string | null
  accent_color: string
  thumbnail_url: string | null
  estimated_hours: number | null
  trail_type: string
  created_at: string
  creator: { name: string } | null
}

type TrailFilter = 'all' | 'linear' | 'livre'
type SortOption = 'recent' | 'az'

const TRAIL_LABELS: Record<TrailFilter, string> = {
  all: 'Todos',
  linear: 'Linear',
  livre: 'Livre',
}

const SORT_LABELS: Record<SortOption, string> = {
  recent: 'Mais recentes',
  az: 'A–Z',
}

export function CoursesCatalog({ courses }: { courses: Course[] }) {
  const [query, setQuery] = useState('')
  const [trail, setTrail] = useState<TrailFilter>('all')
  const [sort, setSort] = useState<SortOption>('recent')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()

    let result = courses.filter((c) => {
      const matchesText =
        !q ||
        c.title.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q) ||
        (c.creator?.name ?? '').toLowerCase().includes(q)

      const matchesTrail = trail === 'all' || c.trail_type === trail

      return matchesText && matchesTrail
    })

    if (sort === 'az') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
    }
    // 'recent' already ordered by created_at desc from server

    return result
  }, [courses, query, trail, sort])

  return (
    <div>
      {/* Barra de busca + filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="search"
            placeholder="Buscar cursos, professores…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)]"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Trail type */}
        <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-1">
          {(['all', 'linear', 'livre'] as TrailFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => setTrail(t)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                trail === t
                  ? 'bg-[var(--green)]/10 text-[var(--green)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              )}
            >
              {TRAIL_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--green)] cursor-pointer"
        >
          {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {/* Contador */}
      <p className="text-xs text-[var(--muted)] mb-4">
        {filtered.length === courses.length
          ? `${courses.length} cursos disponíveis`
          : `${filtered.length} de ${courses.length} cursos`}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-16 text-center">
          <BookOpen size={36} className="mx-auto mb-3 text-[var(--muted)] opacity-40" />
          <p className="text-[var(--muted)] text-sm">Nenhum curso encontrado para &ldquo;{query}&rdquo;</p>
          <button
            onClick={() => { setQuery(''); setTrail('all') }}
            className="mt-3 text-xs text-[var(--green)] hover:underline"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((course) => (
            <a
              key={course.id}
              href={`/courses/${course.id}`}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--muted)] transition-all group hover:-translate-y-0.5"
            >
              {/* Thumbnail */}
              <div
                className="h-36 flex items-center justify-center text-3xl font-black"
                style={{ backgroundColor: course.accent_color + '22', color: course.accent_color }}
              >
                {course.thumbnail_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  : course.title[0]
                }
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: course.accent_color + '22', color: course.accent_color }}
                  >
                    {course.trail_type}
                  </span>
                </div>
                <h2 className="font-semibold text-sm text-[var(--text)] group-hover:text-[var(--green)] transition-colors line-clamp-2 mb-2">
                  {course.title}
                </h2>
                <p className="text-xs text-[var(--muted)] mb-3 line-clamp-2">{course.description}</p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--muted)] truncate">
                    por {course.creator?.name}
                  </span>
                  {course.estimated_hours && (
                    <span className="flex items-center gap-1 text-xs text-[var(--muted)] shrink-0">
                      <Clock size={11} />
                      {course.estimated_hours}h
                    </span>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
