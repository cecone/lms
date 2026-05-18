import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'green' | 'blue' | 'amber' | 'red' | 'muted'
  className?: string
}

export function Badge({ children, variant = 'muted', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border',
        {
          'text-[var(--green)] border-[var(--green)]/30 bg-[var(--green)]/10': variant === 'green',
          'text-[var(--blue)] border-[var(--blue)]/30 bg-[var(--blue)]/10': variant === 'blue',
          'text-[var(--amber)] border-[var(--amber)]/30 bg-[var(--amber)]/10': variant === 'amber',
          'text-[var(--red)] border-[var(--red)]/30 bg-[var(--red)]/10': variant === 'red',
          'text-[var(--muted)] border-[var(--border)] bg-[var(--surface)]': variant === 'muted',
        },
        className
      )}
    >
      {children}
    </span>
  )
}
