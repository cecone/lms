'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  BookOpen,
  LayoutDashboard,
  Trophy,
  BarChart2,
  ShieldCheck,
  PenSquare,
  GraduationCap,
  LogOut,
  User,
  Users,
} from 'lucide-react'
import type { Role } from '@/types/database'
import { NotificationBell } from './notification-bell'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles?: Role[]
}

const navItems: NavItem[] = [
  { href: '/',             label: 'Início',       icon: <LayoutDashboard size={18} /> },
  { href: '/courses',      label: 'Cursos',        icon: <BookOpen size={18} /> },
  { href: '/achievements', label: 'Conquistas',    icon: <Trophy size={18} /> },
  { href: '/leaderboard',  label: 'Ranking',       icon: <BarChart2 size={18} /> },
  { href: '/profile',      label: 'Perfil',        icon: <User size={18} /> },
  { href: '/studio',       label: 'Studio',        icon: <PenSquare size={18} />, roles: ['professor', 'coordenador', 'admin'] },
  { href: '/reports',      label: 'Relatórios',    icon: <GraduationCap size={18} />, roles: ['coordenador', 'admin'] },
  { href: '/admin',        label: 'Administração', icon: <ShieldCheck size={18} />, roles: ['admin'] },
  { href: '/admin/users',  label: 'Usuários',      icon: <Users size={18} />,      roles: ['admin'] },
  { href: '/admin/badges', label: 'Badges',        icon: <Trophy size={18} />,     roles: ['admin'] },
]

interface SidebarProps {
  role: Role
  name: string
  email: string
  avatarUrl?: string | null
  userId: string
}

export function Sidebar({ role, name, email, avatarUrl, userId }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const visible = navItems.filter(
    (item) => !item.roles || item.roles.includes(role)
  )

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className="fixed top-0 left-0 h-screen w-[var(--sidebar-w)] bg-[var(--surface)] border-r border-[var(--border)] flex-col z-40 hidden md:flex"
      aria-label="Navegação principal"
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[var(--border)] flex items-center justify-between">
        <span className="text-lg font-black tracking-tight text-[var(--green)]">
          learn·studio
        </span>
        <NotificationBell userId={userId} />
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto" aria-label="Menu">
        <ul className="space-y-0.5 px-2">
          {visible.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[var(--green)]/10 text-[var(--green)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User */}
      <div className="p-4 border-t border-[var(--border)] space-y-2">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[var(--green)]/20 flex items-center justify-center text-xs font-bold text-[var(--green)]">
              {name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-[var(--text)]">{name}</p>
            <p className="text-xs text-[var(--muted)] truncate">{email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-xs text-[var(--muted)] hover:text-[var(--red)] transition-colors w-full px-2 py-1.5 rounded hover:bg-[var(--red)]/10"
          aria-label="Sair da conta"
        >
          <LogOut size={13} />
          Sair
        </button>
      </div>
    </aside>
  )
}
