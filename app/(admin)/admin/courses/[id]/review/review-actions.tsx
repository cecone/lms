'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { approveCourse, rejectCourse } from './actions'

export function ReviewActions({ courseId }: { courseId: string }) {
  const [pending, start] = useTransition()
  const [showReject, setShowReject] = useState(false)
  const [note, setNote] = useState('')

  function handleApprove() {
    if (!confirm('Publicar este curso?')) return
    start(() => approveCourse(courseId))
  }

  function handleReject() {
    start(() => rejectCourse(courseId, note))
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
        <AlertTriangle size={15} className="text-[var(--amber)]" />
        Decisão de revisão
      </h2>

      {!showReject ? (
        <div className="flex gap-3">
          <Button
            size="sm"
            loading={pending}
            onClick={handleApprove}
            className="gap-1.5 flex-1"
          >
            <CheckCircle size={14} />Aprovar e publicar
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => setShowReject(true)}
            className="gap-1.5 flex-1"
          >
            <XCircle size={14} />Reprovar
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--muted)]">
              Motivo da reprovação (opcional — será enviado ao criador)
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ex: faltam descrições nas aulas, conteúdo incompleto…"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--red)] resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              loading={pending}
              onClick={handleReject}
              className="gap-1.5 text-red-400 border-red-400/30 hover:bg-red-400/10"
            >
              <XCircle size={14} />Confirmar reprovação
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => setShowReject(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
