import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m`
  return `${m}m`
}

export function xpToLevel(xp: number): number {
  // 100 XP = level 1, doubles every level
  return Math.floor(Math.log2(xp / 100 + 1)) + 1
}

export function levelToXP(level: number): number {
  return Math.pow(2, level - 1) * 100
}

export function xpProgressInLevel(xp: number): { current: number; needed: number; pct: number } {
  const level = xpToLevel(xp)
  const start = levelToXP(level)
  const end = levelToXP(level + 1)
  const current = xp - start
  const needed = end - start
  return { current, needed, pct: Math.round((current / needed) * 100) }
}

export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}
