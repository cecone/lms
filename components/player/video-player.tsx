'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Loader2, AlertCircle } from 'lucide-react'

interface VideoPlayerProps {
  url: string
  title: string
  onProgress: (pct: number) => void
  onComplete: () => void
  completed?: boolean
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function VideoPlayer({ url, title, onProgress, onComplete, completed }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastReportRef = useRef(0)
  const completedRef = useRef(completed ?? false)

  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>()

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play().catch(err => {
        console.error('play() failed:', err)
        setError(`Não foi possível reproduzir: ${err.message}`)
      })
    } else {
      v.pause()
    }
  }, [])

  const skip = useCallback((sec: number) => {
    if (videoRef.current) videoRef.current.currentTime += sec
  }, [])

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return
    videoRef.current.muted = !videoRef.current.muted
    setMuted(v => !v)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    if (document.fullscreenElement) document.exitFullscreen()
    else containerRef.current.requestFullscreen()
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.code === 'Space') { e.preventDefault(); togglePlay() }
      if (e.code === 'ArrowLeft') skip(-10)
      if (e.code === 'ArrowRight') skip(10)
      if (e.code === 'KeyM') toggleMute()
      if (e.code === 'KeyF') toggleFullscreen()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePlay, skip, toggleMute, toggleFullscreen])

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    clearTimeout(controlsTimer.current)
    if (playing) {
      controlsTimer.current = setTimeout(() => setShowControls(false), 3000)
    }
  }, [playing])

  useEffect(() => {
    return () => clearTimeout(controlsTimer.current)
  }, [])

  function handleTimeUpdate() {
    const v = videoRef.current
    if (!v) return
    setCurrentTime(v.currentTime)
    const nowPct = v.duration > 0 ? v.currentTime / v.duration : 0

    if (nowPct - lastReportRef.current >= 0.05) {
      lastReportRef.current = nowPct
      onProgress(Math.round(nowPct * 100))
    }

    if (!completedRef.current && nowPct >= 0.9) {
      completedRef.current = true
      onComplete()
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-[var(--red)]/30 bg-[var(--red)]/5 gap-3 text-[var(--red)]">
        <AlertCircle size={32} className="opacity-60" />
        <p className="text-sm text-center max-w-xs">{error}</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-xl overflow-hidden select-none"
      onMouseMove={resetControlsTimer}
    >
      <video
        ref={videoRef}
        src={url}
        className="w-full aspect-video"
        preload="metadata"
        aria-label={title}
        onLoadedMetadata={() => {
          setDuration(videoRef.current?.duration ?? 0)
          setLoading(false)
        }}
        onCanPlay={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
        onPlaying={() => setLoading(false)}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => { setPlaying(true); resetControlsTimer() }}
        onPause={() => setPlaying(false)}
        onError={() => {
          setError('Erro ao carregar o vídeo. Verifique a URL do conteúdo.')
          setLoading(false)
        }}
      />

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 size={36} className="text-white animate-spin" />
        </div>
      )}

      {/* Overlay controls */}
      {!loading && (
        <div
          className={cn(
            'absolute inset-0 flex flex-col justify-end transition-opacity duration-300 bg-gradient-to-t from-black/70 via-transparent',
            showControls || !playing ? 'opacity-100' : 'opacity-0'
          )}
        >
          {/* Big play button */}
          {!playing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <button
                onPointerDown={(e) => { e.stopPropagation(); togglePlay() }}
                className="bg-white/20 backdrop-blur-sm rounded-full p-4 hover:bg-white/30 transition-colors pointer-events-auto"
                aria-label="Reproduzir"
              >
                <Play size={32} className="text-white" />
              </button>
            </div>
          )}

          {/* Progress bar */}
          <div className="px-4 pb-1">
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={currentTime}
              onChange={e => {
                if (videoRef.current) videoRef.current.currentTime = Number(e.target.value)
              }}
              className="w-full h-1 accent-[var(--green)] cursor-pointer"
              aria-label="Progresso do vídeo"
            />
          </div>

          {/* Buttons row */}
          <div className="flex items-center gap-3 px-4 pb-3">
            <button
              onPointerDown={togglePlay}
              className="text-white hover:text-[var(--green)] transition-colors"
              aria-label={playing ? 'Pausar' : 'Reproduzir'}
            >
              {playing ? <Pause size={20} /> : <Play size={20} />}
            </button>

            <button onPointerDown={() => skip(-10)} className="text-white/70 hover:text-white transition-colors" aria-label="Voltar 10s">
              <RotateCcw size={16} />
            </button>

            <span className="text-white/70 text-xs tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            <button onPointerDown={toggleMute} className="text-white/70 hover:text-white transition-colors" aria-label={muted ? 'Ativar som' : 'Silenciar'}>
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            <button onPointerDown={toggleFullscreen} className="text-white/70 hover:text-white transition-colors" aria-label="Tela cheia">
              <Maximize size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Completed badge */}
      {completed && (
        <div className="absolute top-3 right-3 bg-[var(--green)] text-[#0D1A0D] text-xs font-bold px-2 py-1 rounded-full">
          ✓ Concluído
        </div>
      )}
    </div>
  )
}
