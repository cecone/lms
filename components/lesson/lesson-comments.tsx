'use client'

import { useState, useTransition, useRef } from 'react'
import { MessageSquare, Send, Trash2 } from 'lucide-react'
import { postComment, deleteComment } from '@/app/(dashboard)/courses/[id]/learn/[lessonId]/actions'
import { cn } from '@/lib/utils'

interface Comment {
  id: string
  user_id: string
  content: string
  created_at: string
  user: { name: string; avatar_url: string | null } | null
}

interface Props {
  lessonId: string
  userId: string
  userRole: string
  initialComments: Comment[]
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

function Avatar({ name, url }: { name: string; url: string | null }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (url) return <img src={url} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0" />
  return (
    <div className="w-8 h-8 rounded-full bg-[var(--green)]/20 flex items-center justify-center text-xs font-bold text-[var(--green)] shrink-0">
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}

export function LessonComments({ lessonId, userId, userRole, initialComments }: Props) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const canModerate = ['coordenador', 'admin'].includes(userRole)

  function handleSubmit() {
    if (!text.trim()) return
    setError(null)

    startTransition(async () => {
      const result = await postComment(lessonId, text)
      if ('error' in result && result.error) {
        setError(result.error)
        return
      }
      if ('comment' in result && result.comment) {
        setComments((prev) => [result.comment as unknown as Comment, ...prev])
        setText('')
        textareaRef.current?.focus()
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteComment(id)
      if (!('error' in result)) {
        setComments((prev) => prev.filter((c) => c.id !== id))
      }
    })
  }

  return (
    <div className="pt-6 border-t border-[var(--border)]">
      <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2 mb-5">
        <MessageSquare size={15} className="text-[var(--blue)]" />
        Comentários
        {comments.length > 0 && (
          <span className="text-xs font-normal text-[var(--muted)]">({comments.length})</span>
        )}
      </h3>

      {/* Form */}
      <div className="mb-6 space-y-2">
        <textarea
          ref={textareaRef}
          rows={2}
          placeholder="Escreva um comentário ou dúvida…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit()
          }}
          disabled={pending}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)] resize-none disabled:opacity-50"
        />
        {error && <p className="text-xs text-[var(--red)]">{error}</p>}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[var(--muted)]">Ctrl+Enter para enviar</span>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || pending}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              text.trim() && !pending
                ? 'bg-[var(--green)] text-[#0D1A0D] hover:opacity-90'
                : 'bg-white/5 text-[var(--muted)] cursor-not-allowed'
            )}
          >
            <Send size={12} />
            Enviar
          </button>
        </div>
      </div>

      {/* List */}
      {comments.length === 0 ? (
        <p className="text-sm text-[var(--muted)] text-center py-6">
          Nenhum comentário ainda. Seja o primeiro!
        </p>
      ) : (
        <ul className="space-y-5">
          {comments.map((c) => {
            const authorName = c.user?.name ?? 'Usuário'
            const canDelete = c.user_id === userId || canModerate

            return (
              <li key={c.id} className="flex gap-3 group">
                <Avatar name={authorName} url={c.user?.avatar_url ?? null} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-[var(--text)]">{authorName}</span>
                    <span className="text-[10px] text-[var(--muted)]">{relativeDate(c.created_at)}</span>
                    {c.user_id === userId && (
                      <span className="text-[10px] text-[var(--green)] font-medium">você</span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap break-words">
                    {c.content}
                  </p>
                </div>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={pending}
                    className="shrink-0 p-1 text-[var(--muted)] hover:text-[var(--red)] transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Deletar comentário"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
