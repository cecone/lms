'use client'

import { useState } from 'react'
import { Download, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PDFViewerProps {
  url: string
  title: string
  allowDownload?: boolean
  onProgress: (pct: number) => void
  onComplete: () => void
  completed?: boolean
}

export function PDFViewer({ url, title, allowDownload = true, onProgress, onComplete, completed }: PDFViewerProps) {
  const [marked, setMarked] = useState(completed ?? false)

  function handleMark() {
    if (marked) return
    setMarked(true)
    onProgress(100)
    onComplete()
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
        <span className="text-xs text-[var(--muted)] uppercase tracking-wide">PDF — {title}</span>
        <div className="flex items-center gap-2">
          {allowDownload && (
            <a
              href={url}
              download
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              aria-label="Baixar PDF"
            >
              <Download size={15} />
            </a>
          )}
          {marked && (
            <span className="text-xs font-bold text-[var(--green)] bg-[var(--green)]/10 border border-[var(--green)]/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle size={12} />
              Concluído
            </span>
          )}
        </div>
      </div>

      {/* PDF via Google Docs Viewer — evita bloqueios de X-Frame-Options */}
      <div style={{ height: '70vh' }}>
        <iframe
          src={`https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`}
          className="w-full h-full border-0"
          title={title}
        />
      </div>

      {/* Botão marcar como lido */}
      {!marked && (
        <div className="p-4 border-t border-[var(--border)] flex justify-end">
          <Button onClick={handleMark} size="sm" className="gap-2">
            <CheckCircle size={14} />
            Marcar como lido
          </Button>
        </div>
      )}
    </div>
  )
}
