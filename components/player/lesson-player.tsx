'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { VideoPlayer } from './video-player'
import { AudioPlayer } from './audio-player'
import { useProgressTracker } from './progress-tracker'

const PDFViewer = dynamic(
  () => import('./pdf-viewer').then((m) => m.PDFViewer),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-64 text-[var(--muted)] text-sm">Carregando PDF…</div> }
)

const ScormPlayer = dynamic(
  () => import('./scorm-player').then((m) => m.ScormPlayer),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-64 text-[var(--muted)] text-sm">Carregando SCORM…</div> }
)

const QuizPlayer = dynamic(
  () => import('./quiz-player').then((m) => m.QuizPlayer),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-64 text-[var(--muted)] text-sm">Carregando quiz…</div> }
)
import { CheckCircle, Layers } from 'lucide-react'
import type { ContentType, LessonStatus } from '@/types/database'

interface LessonPlayerProps {
  lessonId: string
  userId: string
  title: string
  contentType: ContentType
  contentUrl: string | null
  initialStatus: LessonStatus
  allowDownload?: boolean
}

export function LessonPlayer({
  lessonId,
  userId,
  title,
  contentType,
  contentUrl,
  initialStatus,
  allowDownload = true,
}: LessonPlayerProps) {
  const router = useRouter()
  const [status, setStatus] = useState<LessonStatus>(initialStatus)
  const [showCompleteBanner, setShowCompleteBanner] = useState(false)

  const { handleProgress, handleComplete } = useProgressTracker({
    lessonId,
    userId,
    initialStatus,
    onStatusChange: (s) => {
      setStatus(s)
      if (s === 'completed') {
        setShowCompleteBanner(true)
        router.refresh()
      }
    },
  })

  if (!contentUrl && contentType !== 'quiz') {
    return (
      <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] gap-3 text-[var(--muted)]">
        <Layers size={32} className="opacity-40" />
        <p className="text-sm">Conteúdo não disponível.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Completion banner */}
      {showCompleteBanner && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/30 text-[var(--green)] animate-fade-in">
          <CheckCircle size={18} />
          <span className="text-sm font-semibold">Aula concluída! +10 XP</span>
        </div>
      )}

      {/* Player */}
      {contentType === 'video' && (
        <VideoPlayer
          url={contentUrl!}
          title={title}
          onProgress={handleProgress}
          onComplete={handleComplete}
          completed={status === 'completed'}
        />
      )}

      {contentType === 'audio' && (
        <AudioPlayer
          url={contentUrl!}
          title={title}
          onProgress={handleProgress}
          onComplete={handleComplete}
          completed={status === 'completed'}
        />
      )}

      {contentType === 'pdf' && (
        <PDFViewer
          url={contentUrl!}
          title={title}
          allowDownload={allowDownload}
          onProgress={handleProgress}
          onComplete={handleComplete}
          completed={status === 'completed'}
        />
      )}

      {contentType === 'scorm' && (
        <ScormPlayer
          url={contentUrl!}
          onComplete={handleComplete}
          completed={status === 'completed'}
        />
      )}

      {contentType === 'quiz' && (
        <QuizPlayer
          lessonId={lessonId}
          onComplete={handleComplete}
          completed={status === 'completed'}
        />
      )}

      {contentType === 'h5p' && (
        <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] gap-3 text-[var(--muted)]">
          <Layers size={32} className="opacity-40" />
          <p className="text-sm">H5P — em breve</p>
        </div>
      )}
    </div>
  )
}
