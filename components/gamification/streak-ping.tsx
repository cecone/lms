'use client'

import { useEffect } from 'react'

/** Fire-and-forget: touches streak on first render of the dashboard. */
export function StreakPing() {
  useEffect(() => {
    fetch('/api/touch-streak', { method: 'POST' }).catch(() => {})
  }, [])
  return null
}
