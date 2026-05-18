import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-[var(--surface)] border border-[var(--border)]',
        className
      )}
      aria-hidden="true"
    />
  )
}
