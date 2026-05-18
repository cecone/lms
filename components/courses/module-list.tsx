import Link from 'next/link'
import { cn } from '@/lib/utils'
import { formatDuration } from '@/lib/utils'
import { CheckCircle, Circle, Lock, PlayCircle, FileText, Music, Layers } from 'lucide-react'
import type { ContentType, LessonStatus } from '@/types/database'

interface LessonItem {
  id: string
  title: string
  order: number
  content_type: ContentType
  duration_seconds: number | null
  is_free_preview: boolean
  status: LessonStatus
  locked: boolean
}

interface ModuleItem {
  id: string
  title: string
  order: number
  lessons: LessonItem[]
}

interface ModuleListProps {
  courseId: string
  modules: ModuleItem[]
  currentLessonId?: string
  enrolled: boolean
}

const CONTENT_ICONS: Record<ContentType, React.ReactNode> = {
  video:  <PlayCircle size={14} />,
  pdf:    <FileText size={14} />,
  audio:  <Music size={14} />,
  scorm:  <Layers size={14} />,
  h5p:    <Layers size={14} />,
  quiz:   <Circle size={14} />,
}

function StatusIcon({ status, locked }: { status: LessonStatus; locked: boolean }) {
  if (locked) return <Lock size={14} className="text-[var(--border)] flex-shrink-0" />
  if (status === 'completed') return <CheckCircle size={14} className="text-[var(--green)] flex-shrink-0" />
  if (status === 'in_progress') return (
    <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--blue)] flex-shrink-0 animate-pulse-slow" />
  )
  return <Circle size={14} className="text-[var(--border)] flex-shrink-0" />
}

export function ModuleList({ courseId, modules, currentLessonId, enrolled }: ModuleListProps) {
  if (modules.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)] py-4">
        Nenhum módulo disponível ainda.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {modules.map((mod) => {
        const completedCount = mod.lessons.filter(l => l.status === 'completed').length
        const totalCount = mod.lessons.length

        return (
          <div key={mod.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
            {/* Module header */}
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="font-semibold text-sm text-[var(--text)]">{mod.title}</h3>
              {enrolled && (
                <span className="text-xs text-[var(--muted)]">
                  {completedCount}/{totalCount}
                </span>
              )}
            </div>

            {/* Lessons */}
            <ul>
              {mod.lessons.map((lesson) => {
                const isCurrent = lesson.id === currentLessonId
                const canAccess = enrolled && !lesson.locked || lesson.is_free_preview

                const content = (
                  <div
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-0 transition-colors text-sm',
                      isCurrent && 'bg-[var(--green)]/5',
                      canAccess && !isCurrent && 'hover:bg-white/3 cursor-pointer',
                      !canAccess && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <StatusIcon status={lesson.status} locked={lesson.locked && !lesson.is_free_preview} />
                    <span className="flex-shrink-0 text-[var(--muted)]">
                      {CONTENT_ICONS[lesson.content_type]}
                    </span>
                    <span className={cn(
                      'flex-1 truncate',
                      isCurrent ? 'text-[var(--green)] font-medium' : 'text-[var(--text)]'
                    )}>
                      {lesson.title}
                      {lesson.is_free_preview && !enrolled && (
                        <span className="ml-2 text-[10px] text-[var(--amber)] border border-[var(--amber)]/30 rounded px-1">
                          preview
                        </span>
                      )}
                    </span>
                    {lesson.duration_seconds && (
                      <span className="text-xs text-[var(--muted)] flex-shrink-0">
                        {formatDuration(lesson.duration_seconds)}
                      </span>
                    )}
                  </div>
                )

                return (
                  <li key={lesson.id} aria-current={isCurrent ? 'step' : undefined}>
                    {canAccess ? (
                      <Link href={`/courses/${courseId}/learn/${lesson.id}`}>
                        {content}
                      </Link>
                    ) : content}
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
