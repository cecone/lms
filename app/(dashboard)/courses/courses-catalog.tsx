'use client'

import { useState, useMemo } from 'react'
import { Search, X, Clock, BookOpen, User } from 'lucide-react'
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

// Rótulo amigável do tipo de trilha exibido no card
const TRAIL_BADGE: Record<string, string> = {
  linear: 'Linear',
  livre: 'Livre',
  nonlinear: 'Não linear',
  adaptive: 'Adaptativa',
}

const SORT_LABELS: Record<SortOption, string> = {
  recent: 'Mais recentes',
  az: 'A–Z',
}

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green)] ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]'

const fieldBase =
  'rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] ' +
  'focus:outline-none focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)]'

export function CoursesCatalog({ courses }: { courses: Course[] }) {
  const [query, setQuery] = useState('')
  const [trail, setTrail] = useState<TrailFilter>('all')
  const [sort, setSort]   = useState<SortOption>('recent')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()

    let result = courses.filter((c) => {
      const matchesText =
        !q ||
        c.title.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q) ||
        (c.creator?.name ?? '').toLowerCase().includes(q)

      // "Linear" = trilha linear; "Livre" = qualquer trilha não-linear
      // (nonlinear/adaptive). O banco nunca guarda o literal 'livre'.
      const matchesTrail =
        trail === 'all' ||
        (trail === 'linear' ? c.trail_type === 'linear' : c.trail_type !== 'linear')
      return matchesText && matchesTrail
    })

    if (sort === 'az') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
    }
    return result
  }, [courses, query, trail, sort])

  return (
    <div>
      {/* Busca + filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" aria-hidden />
          <input
            type="search"
            placeholder="Buscar cursos, professores…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={cn('w-full pl-9 pr-9 py-2', fieldBase)}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Limpar busca"
              className={cn('absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--muted)] hover:text-[var(--text)]', focusRing)}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Tipo de trilha */}
        <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-1" role="group" aria-label="Filtrar por trilha">
          {(['all', 'linear', 'livre'] as TrailFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => setTrail(t)}
              aria-pressed={trail === t}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                focusRing,
                trail === t
                  ? 'bg-[var(--green)]/10 text-[var(--green)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              )}
            >
              {TRAIL_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Ordenação */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          aria-label="Ordenar cursos"
          className={cn('px-3 py-2 cursor-pointer', fieldBase, focusRing)}
        >
          {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {/* Contador */}
      <p className="text-xs text-[var(--muted)] mb-4 tabular-nums">
        {filtered.length === courses.length
          ? `${courses.length} cursos disponíveis`
          : `${filtered.length} de ${courses.length} cursos`}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--border)] flex items-center justify-center mx-auto mb-4">
            <BookOpen size={24} className="text-[var(--muted)]" aria-hidden />
          </div>
          <p className="text-[var(--muted)] text-sm">
            {query ? <>Nenhum curso encontrado para &ldquo;{query}&rdquo;</> : 'Nenhum curso nesse filtro'}
          </p>
          <button
            onClick={() => { setQuery(''); setTrail('all') }}
            className={cn('mt-3 text-xs font-medium text-[var(--green)] hover:underline rounded px-1', focusRing)}
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
              className={cn(
                'bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden group transition-all',
                'hover:border-[var(--border-strong)] hover:-translate-y-0.5',
                focusRing
              )}
            >
              {/* Thumbnail */}
              <div
                className="h-36 flex items-center justify-center text-3xl font-medium overflow-hidden"
                style={{ backgroundColor: course.accent_color + '22', color: course.accent_color }}
              >
                {course.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  course.title[0]
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <span
                  className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-md mb-2"
                  style={{ backgroundColor: course.accent_color + '22', color: course.accent_color }}
                >
                  {TRAIL_BADGE[course.trail_type] ?? course.trail_type}
                </span>

                <h2 className="font-medium text-sm text-[var(--text)] group-hover:text-[var(--green)] transition-colors line-clamp-2 mb-2">
                  {course.title}
                </h2>

                {course.description && (
                  <p className="text-xs text-[var(--muted)] mb-3 line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <User size={11} className="shrink-0" aria-hidden />
                    <span className="truncate">{course.creator?.name ?? 'Autor'}</span>
                  </span>
                  {course.estimated_hours != null && (
                    <span className="flex items-center gap-1 shrink-0 tabular-nums">
                      <Clock size={11} aria-hidden />
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
