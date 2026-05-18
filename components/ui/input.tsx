import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-[var(--text)]">
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={cn(
            'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)] transition-colors',
            'focus:outline-none focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)]',
            error && 'border-[var(--red)] focus:border-[var(--red)] focus:ring-[var(--red)]',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-[var(--red)]" role="alert">{error}</p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'
export { Input }
