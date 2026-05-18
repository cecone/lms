'use client'

import { useRef, useState, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

interface AudioPlayerProps {
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

export function AudioPlayer({ url, title, onProgress, onComplete, completed }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const lastReportRef = useRef(0)
  const completedRef = useRef(completed ?? false)

  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0

  const togglePlay = useCallback(() => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) { a.play(); setPlaying(true) }
    else { a.pause(); setPlaying(false) }
  }, [])

  function handleTimeUpdate() {
    const a = audioRef.current
    if (!a) return
    setCurrentTime(a.currentTime)

    const nowPct = a.duration > 0 ? a.currentTime / a.duration : 0
    if (nowPct - lastReportRef.current >= 0.05) {
      lastReportRef.current = nowPct
      onProgress(Math.round(nowPct * 100))
    }

    if (!completedRef.current && nowPct >= 0.8) {
      completedRef.current = true
      onComplete()
    }
  }

  function setAudioSpeed(s: number) {
    if (audioRef.current) audioRef.current.playbackRate = s
    setSpeed(s)
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
      <audio
        ref={audioRef}
        src={url}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setPlaying(false)}
      />

      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--muted)] uppercase tracking-wide mb-1">Áudio</p>
          <h3 className="font-semibold text-[var(--text)] text-sm line-clamp-1">{title}</h3>
        </div>
        {completed && (
          <span className="text-xs font-bold text-[var(--green)] bg-[var(--green)]/10 border border-[var(--green)]/30 px-2 py-1 rounded-full">
            ✓ Concluído
          </span>
        )}
      </div>

      {/* Waveform visual (decorative) */}
      <div className="flex items-center gap-0.5 h-10 justify-center opacity-40" aria-hidden>
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="w-1 rounded-full transition-all"
            style={{
              height: `${Math.max(15, Math.sin(i * 0.5) * 20 + 25)}%`,
              backgroundColor: (i / 40) * 100 <= pct ? 'var(--green)' : 'var(--border)',
            }}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={currentTime}
          onChange={e => {
            if (audioRef.current) audioRef.current.currentTime = Number(e.target.value)
          }}
          className="w-full h-1.5 accent-[var(--green)] cursor-pointer"
          aria-label="Progresso do áudio"
        />
        <div className="flex justify-between text-xs text-[var(--muted)] tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Speed */}
        <div className="flex items-center gap-1" role="group" aria-label="Velocidade de reprodução">
          {SPEEDS.map(s => (
            <button
              key={s}
              onClick={() => setAudioSpeed(s)}
              className={cn(
                'text-xs px-2 py-1 rounded font-medium transition-colors',
                speed === s
                  ? 'bg-[var(--green)] text-[#0D1A0D]'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5'
              )}
              aria-pressed={speed === s}
            >
              {s}×
            </button>
          ))}
        </div>

        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-[var(--green)] text-[#0D1A0D] flex items-center justify-center hover:opacity-90 transition-opacity"
          aria-label={playing ? 'Pausar' : 'Reproduzir'}
        >
          {playing ? <Pause size={20} /> : <Play size={20} />}
        </button>

        {/* Mute */}
        <button
          onClick={() => {
            if (audioRef.current) audioRef.current.muted = !muted
            setMuted(v => !v)
          }}
          className="text-[var(--muted)] hover:text-[var(--text)] transition-colors p-2"
          aria-label={muted ? 'Ativar som' : 'Silenciar'}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
    </div>
  )
}
