'use client'

import { useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ProgressTrackerProps {
  lessonId: string
  userId: string
  initialStatus: 'not_started' | 'in_progress' | 'completed'
  onStatusChange?: (status: 'in_progress' | 'completed') => void
}

export function useProgressTracker({
  lessonId,
  userId,
  initialStatus,
  onStatusChange,
}: ProgressTrackerProps) {
  const statusRef = useRef(initialStatus)
  const startedAt = useRef(Date.now())
  const savedCompleted = useRef(initialStatus === 'completed')

  const saveProgress = useCallback(async (status: 'in_progress' | 'completed') => {
    if (savedCompleted.current && status !== 'completed') return
    if (status === statusRef.current && status !== 'completed') return

    statusRef.current = status
    const supabase = createClient()
    const timeSpent = Math.round((Date.now() - startedAt.current) / 1000)

    await supabase.from('progress').upsert({
      user_id: userId,
      lesson_id: lessonId,
      status,
      time_spent: timeSpent,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,lesson_id' })

    if (status === 'completed' && !savedCompleted.current) {
      savedCompleted.current = true
      // Dispara XP via RPC
      await supabase.rpc('add_xp', {
        p_user_id: userId,
        p_amount: 10,
        p_reason: `lesson_complete:${lessonId}`,
      })
      // Verifica se o curso foi concluído e emite certificado
      fetch('/api/check-certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId }),
      }).catch(() => {})
      onStatusChange?.('completed')
    } else {
      onStatusChange?.(status)
    }
  }, [lessonId, userId, onStatusChange])

  const handleProgress = useCallback((pct: number) => {
    if (statusRef.current === 'not_started' && pct > 0) {
      saveProgress('in_progress')
    }
  }, [saveProgress])

  const handleComplete = useCallback(() => {
    saveProgress('completed')
  }, [saveProgress])

  return { handleProgress, handleComplete }
}
