'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Bell, CheckCheck, BookOpen, Users, MessageSquare, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  course_approved:  <BookOpen size={14} className="text-[var(--green)]" />,
  course_rejected:  <BookOpen size={14} className="text-[var(--red)]" />,
  new_enrollment:   <Users size={14} className="text-[var(--blue)]" />,
  new_comment:      <MessageSquare size={14} className="text-[var(--amber)]" />,
}

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

  const unread = notifications.filter((n) => !n.read).length

  // Initial fetch
  useEffect(() => {
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setNotifications(data ?? []))
  }, [userId, supabase])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, supabase])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
  }

  async function handleClick(n: Notification) {
    if (!n.read) await markRead(n.id)
    setOpen(false)
    if (n.link) window.location.href = n.link
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5 transition-colors"
        aria-label="Notificações"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[var(--green)] text-[#0D1A0D] rounded-full text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <span className="text-sm font-semibold text-[var(--text)]">Notificações</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--green)] transition-colors"
                >
                  <CheckCheck size={12} />
                  Marcar todas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-[var(--muted)] hover:text-[var(--text)]">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <ul className="max-h-96 overflow-y-auto divide-y divide-[var(--border)]">
            {notifications.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                Nenhuma notificação ainda.
              </li>
            ) : (
              notifications.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleClick(n)}
                    className={cn(
                      'w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors',
                      !n.read && 'bg-[var(--green)]/5'
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      {TYPE_ICON[n.type] ?? <Bell size={14} className="text-[var(--muted)]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-xs font-semibold truncate', n.read ? 'text-[var(--muted)]' : 'text-[var(--text)]')}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      <p className="text-[10px] text-[var(--muted)] mt-1">{relativeDate(n.created_at)}</p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-[var(--green)] shrink-0 mt-1.5" />
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
