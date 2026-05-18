'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, BookOpen, BarChart2, User, PenSquare, ShieldCheck } from 'lucide-react'
import type { Role } from '@/types/database'

interface BottomNavProps {
  role: Role
}

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname()

  const items = [
    { href: '/',            label: 'Início',  icon: LayoutDashboard },
    { href: '/courses',     label: 'Cursos',  icon: BookOpen },
    { href: '/leaderboard', label: 'Ranking', icon: BarChart2 },
    { href: '/profile',     label: 'Perfil',  icon: User },
    ...(role !== 'aluno'
      ? [{ href: '/studio', label: 'Studio', icon: PenSquare }]
      : []),
    ...(role === 'admin'
      ? [{ href: '/admin', label: 'Admin', icon: ShieldCheck }]
      : []),
  ].slice(0, 5)

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-[var(--border)] flex md:hidden z-40"
      aria-label="Navegação mobile"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-[10px] font-medium transition-colors min-h-[60px]',
              isActive ? 'text-[var(--green)]' : 'text-[var(--muted)]'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
