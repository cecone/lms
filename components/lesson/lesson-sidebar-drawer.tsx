'use client'

import { useState } from 'react'
import { List, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LessonSidebarDrawer({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* FAB — mobile only */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed bottom-[76px] right-4 z-50 w-12 h-12 bg-[var(--green)] text-[#0D1A0D] rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        aria-label="Ver aulas do curso"
      >
        <List size={20} />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer (mobile) / Sidebar (desktop) */}
      <aside
        className={cn(
          // desktop: sticky sidebar
          'lg:w-80 xl:w-96 lg:border-l border-[var(--border)] bg-[var(--surface)] flex flex-col lg:max-h-screen lg:sticky lg:top-0 lg:overflow-y-auto lg:translate-x-0',
          // mobile: fixed drawer from right
          'fixed lg:relative top-0 right-0 h-full w-[85vw] max-w-sm z-50 transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}
      >
        {/* Mobile close button */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] lg:hidden">
          <h2 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
            Conteúdo do curso
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--muted)]"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {children}
      </aside>
    </>
  )
}
