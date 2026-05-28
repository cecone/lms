'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import JSZip from 'jszip'
import { createClient } from '@/lib/supabase/client'
import {
  updateCourseDetails, updateCourseStatus,
  addModule, updateModule, deleteModule, moveModule,
  addLesson, updateLesson, deleteLesson, moveLesson,
  saveQuiz,
} from './actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown,
  ChevronRight, Save, Video, FileText, Music, HelpCircle, Layers,
  Eye, Send, Archive, Upload, CheckCircle, X, BarChart2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Tipos ──────────────────────────────────────────────────────────────

interface QuizQ {
  id: string
  text: string
  options: { id: string; text: string }[]
  correct_option_id: string
  explanation: string
}

interface Lesson {
  id: string; title: string; description: string | null
  content_type: string; content_url: string | null
  duration_seconds: number | null; is_free_preview: boolean; allow_download: boolean
  order: number
}
interface Module { id: string; title: string; order: number; lessons: Lesson[] }
interface Course {
  id: string; title: string; description: string | null
  trail_type: string; accent_color: string; status: string
  estimated_hours: number | null
}

// ── MIME types para upload SCORM ───────────────────────────────────────

function scormMime(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    html: 'text/html', htm: 'text/html',
    css:  'text/css',
    js:   'application/javascript', mjs: 'application/javascript', cjs: 'application/javascript',
    json: 'application/json', xml: 'application/xml',
    png:  'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif:  'image/gif', svg: 'image/svg+xml', webp: 'image/webp', ico: 'image/x-icon',
    mp4:  'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg', ogg: 'audio/ogg',
    ttf:  'font/ttf', woff: 'font/woff', woff2: 'font/woff2', eot: 'application/vnd.ms-fontobject',
    pdf:  'application/pdf', swf: 'application/x-shockwave-flash',
  }
  return map[ext] ?? 'application/octet-stream'
}

// ── Constantes ─────────────────────────────────────────────────────────

const ACCENT_COLORS = ['#4ADE80','#7EB8F7','#FBBF24','#F87171','#C084FC','#FB923C']
const TRAIL_TYPES   = [
  { value: 'linear',    label: 'Linear' },
  { value: 'nonlinear', label: 'Livre' },
  { value: 'adaptive',  label: 'Adaptativo' },
]
const CONTENT_TYPES = [
  { value: 'video', label: 'Vídeo',  icon: Video },
  { value: 'audio', label: 'Áudio',  icon: Music },
  { value: 'pdf',   label: 'PDF',    icon: FileText },
  { value: 'quiz',  label: 'Quiz',   icon: HelpCircle },
  { value: 'scorm', label: 'SCORM',  icon: Layers },
  { value: 'h5p',   label: 'H5P',    icon: Layers },
]
const STATUS_META: Record<string, { label: string; variant: 'muted'|'amber'|'green'|'blue' }> = {
  draft:     { label: 'Rascunho',   variant: 'muted'  },
  pending:   { label: 'Em revisão', variant: 'amber'  },
  published: { label: 'Publicado',  variant: 'green'  },
  archived:  { label: 'Arquivado',  variant: 'muted'  },
}

function contentIcon(type: string) {
  const found = CONTENT_TYPES.find(c => c.value === type)
  const Icon = found?.icon ?? Layers
  return <Icon size={13} />
}

// ── Componente principal ───────────────────────────────────────────────

export function CourseEditor({ course, modules }: { course: Course; modules: Module[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  // Course details form state
  const [details, setDetails] = useState({
    title:           course.title,
    description:     course.description ?? '',
    trail_type:      course.trail_type,
    accent_color:    course.accent_color,
    estimated_hours: course.estimated_hours?.toString() ?? '',
  })

  function refresh() { router.refresh() }

  async function handleSaveDetails() {
    start(async () => { await updateCourseDetails(course.id, details); refresh() })
  }

  async function handleStatus(status: string) {
    start(async () => { await updateCourseStatus(course.id, status); refresh() })
  }

  const statusInfo = STATUS_META[course.status] ?? STATUS_META.draft

  return (
    <div className="p-6 md:p-10 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/studio" className="text-[var(--muted)] hover:text-[var(--text)] transition-colors p-1">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-[var(--text)] truncate">{course.title}</h1>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5">Editor de curso</p>
        </div>
        <Link href={`/studio/courses/${course.id}/analytics`}>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <BarChart2 size={14} /><span className="hidden sm:inline">Analytics</span>
          </Button>
        </Link>
        <Link href={`/courses/${course.id}`} target="_blank">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <Eye size={14} /><span className="hidden sm:inline">Preview</span>
          </Button>
        </Link>
      </div>

      {/* ── Detalhes do curso ── */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Detalhes do curso</h2>

        <div className="space-y-4">
          <Input
            label="Título *"
            value={details.title}
            onChange={e => setDetails(d => ({ ...d, title: e.target.value }))}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text)]">Descrição</label>
            <textarea
              rows={3}
              value={details.description}
              onChange={e => setDetails(d => ({ ...d, description: e.target.value }))}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--text)]">Tipo de trilha</label>
              <select
                value={details.trail_type}
                onChange={e => setDetails(d => ({ ...d, trail_type: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)]"
              >
                {TRAIL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <Input
              label="Horas estimadas"
              type="number" min="0" step="0.5"
              value={details.estimated_hours}
              onChange={e => setDetails(d => ({ ...d, estimated_hours: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[var(--text)]">Cor de destaque</label>
            <div className="flex gap-3">
              {ACCENT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setDetails(d => ({ ...d, accent_color: c }))}
                  className={cn(
                    'w-7 h-7 rounded-full ring-2 ring-transparent transition-all',
                    details.accent_color === c && 'ring-white ring-offset-2 ring-offset-[var(--surface)]'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-[var(--border)]">
          {/* Status actions */}
          <div className="flex gap-2">
            {course.status === 'draft' && (
              <Button size="sm" variant="secondary" loading={pending} onClick={() => handleStatus('pending')} className="gap-1.5">
                <Send size={13} />Enviar para revisão
              </Button>
            )}
            {course.status === 'pending' && (
              <Button size="sm" variant="secondary" loading={pending} onClick={() => handleStatus('published')} className="gap-1.5">
                <Eye size={13} />Publicar
              </Button>
            )}
            {course.status === 'published' && (
              <Button size="sm" variant="secondary" loading={pending} onClick={() => handleStatus('archived')} className="gap-1.5">
                <Archive size={13} />Arquivar
              </Button>
            )}
            {course.status === 'archived' && (
              <Button size="sm" variant="secondary" loading={pending} onClick={() => handleStatus('draft')} className="gap-1.5">
                <Archive size={13} />Reativar
              </Button>
            )}
          </div>
          <Button size="sm" loading={pending} onClick={handleSaveDetails} className="gap-1.5">
            <Save size={13} />Salvar
          </Button>
        </div>
      </section>

      {/* ── Módulos ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--text)]">Módulos e aulas</h2>
          <Button
            size="sm" variant="secondary"
            onClick={() => start(async () => { await addModule(course.id); refresh() })}
            loading={pending}
            className="gap-1.5"
          >
            <Plus size={13} />Módulo
          </Button>
        </div>

        {modules.length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-10 text-center text-sm text-[var(--muted)]">
            Nenhum módulo ainda. Clique em "+ Módulo" para começar.
          </div>
        ) : (
          <div className="space-y-3">
            {modules.map((mod, modIdx) => (
              <ModuleCard
                key={mod.id}
                mod={mod}
                courseId={course.id}
                isFirst={modIdx === 0}
                isLast={modIdx === modules.length - 1}
                onRefresh={refresh}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ── ModuleCard ─────────────────────────────────────────────────────────

function ModuleCard({ mod, courseId, isFirst, isLast, onRefresh }: {
  mod: Module; courseId: string; isFirst: boolean; isLast: boolean; onRefresh: () => void
}) {
  const [open, setOpen]       = useState(true)
  const [editing, setEditing] = useState(false)
  const [title, setTitle]     = useState(mod.title)
  const [pending, start]      = useTransition()

  function save() {
    start(async () => { await updateModule(mod.id, courseId, title); setEditing(false); onRefresh() })
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Module header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
        <button onClick={() => setOpen(o => !o)} className="text-[var(--muted)] hover:text-[var(--text)] transition-colors">
          <ChevronRight size={16} className={cn('transition-transform', open && 'rotate-90')} />
        </button>

        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={save}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setTitle(mod.title); setEditing(false) } }}
            className="flex-1 bg-transparent border-b border-[var(--green)] text-sm font-semibold text-[var(--text)] focus:outline-none"
          />
        ) : (
          <span
            className="flex-1 text-sm font-semibold text-[var(--text)] cursor-pointer hover:text-[var(--green)] transition-colors"
            onClick={() => setEditing(true)}
          >
            {mod.title}
          </span>
        )}

        <span className="text-xs text-[var(--muted)]">{mod.lessons.length} aula{mod.lessons.length !== 1 ? 's' : ''}</span>

        <div className="flex items-center gap-1 ml-1">
          <button disabled={isFirst || pending} onClick={() => start(async () => { await moveModule(mod.id, courseId, 'up'); onRefresh() })}
            className="p-1 text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-30 transition-colors">
            <ChevronUp size={14} />
          </button>
          <button disabled={isLast || pending} onClick={() => start(async () => { await moveModule(mod.id, courseId, 'down'); onRefresh() })}
            className="p-1 text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-30 transition-colors">
            <ChevronDown size={14} />
          </button>
          <button onClick={() => { if (confirm(`Excluir módulo "${mod.title}" e todas as suas aulas?`)) start(async () => { await deleteModule(mod.id, courseId); onRefresh() }) }}
            className="p-1 text-[var(--muted)] hover:text-[var(--red)] transition-colors ml-1">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Lessons */}
      {open && (
        <div className="divide-y divide-[var(--border)]">
          {mod.lessons.length === 0 && (
            <p className="text-xs text-[var(--muted)] px-4 py-3">Nenhuma aula ainda.</p>
          )}
          {mod.lessons.map((lesson, lessonIdx) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              moduleId={mod.id}
              courseId={courseId}
              isFirst={lessonIdx === 0}
              isLast={lessonIdx === mod.lessons.length - 1}
              onRefresh={onRefresh}
            />
          ))}
          <div className="px-4 py-2.5">
            <button
              onClick={() => start(async () => { await addLesson(mod.id, courseId); onRefresh() })}
              disabled={pending}
              className="text-xs text-[var(--muted)] hover:text-[var(--green)] flex items-center gap-1.5 transition-colors"
            >
              <Plus size={13} />Adicionar aula
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── LessonRow ──────────────────────────────────────────────────────────

function LessonRow({ lesson, moduleId, courseId, isFirst, isLast, onRefresh }: {
  lesson: Lesson; moduleId: string; courseId: string
  isFirst: boolean; isLast: boolean; onRefresh: () => void
}) {
  const [open, setOpen]         = useState(false)
  const [form, setForm]         = useState({
    title:            lesson.title,
    description:      lesson.description ?? '',
    content_type:     lesson.content_type,
    content_url:      lesson.content_url ?? '',
    duration_seconds: lesson.duration_seconds?.toString() ?? '',
    is_free_preview:  lesson.is_free_preview,
    allow_download:   lesson.allow_download,
  })
  const [uploading, setUploading] = useState(false)
  const [uploadDone, setUploadDone] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pending, start] = useTransition()

  async function handleScormUpload(file: File) {
    if (!file.name.endsWith('.zip')) return
    setUploading(true)
    setUploadDone(false)
    try {
      const supabase  = createClient()
      const zip       = await JSZip.loadAsync(file)
      const files     = Object.keys(zip.files).filter(n => !zip.files[n].dir)
      const basePath  = `scorm/${lesson.id}/`

      // Descobre o arquivo de launch
      let launchFile = ''

      // Resolve o href do manifest para o caminho COMPLETO dentro do ZIP.
      // Problema: manifest diz href="blank.html" mas o arquivo está em
      // "content/blank.html" → o upload fica em scorm/{id}/content/blank.html
      // mas a URL seria /api/scorm/{id}/blank.html → 404.
      // Esta função devolve o caminho real (ex: "content/blank.html").
      const resolveInZip = (href: string): string | null => {
        const lower = href.toLowerCase()
        // 1. Correspondência exata
        const exact = files.find(f => f.toLowerCase() === lower)
        if (exact) return exact
        // 2. Arquivo em alguma subpasta (href sem pasta, arquivo com pasta)
        const byName = files.find(f => f.toLowerCase().endsWith('/' + lower))
        if (byName) return byName
        // 3. href já inclui subpasta parcial: compara o sufixo completo
        const bySuffix = files.find(f => f.toLowerCase().endsWith(lower))
        return bySuffix ?? null
      }

      // 1) Tenta ler o imsmanifest.xml via regex (evita problemas de namespace com DOMParser)
      const manifestPath = files.find(f => f.toLowerCase().endsWith('imsmanifest.xml'))
      if (manifestPath) {
        const text = await zip.files[manifestPath].async('string')
        // Primeiro: resource com scormtype="sco" (Articulate, iSpring, etc.)
        const scoMatch =
          text.match(/adlcp:scormtype\s*=\s*["']sco["'][^>]*?\bhref\s*=\s*["']([^"'?#\s]+)/i) ||
          text.match(/\bhref\s*=\s*["']([^"'?#\s]+)["'][^>]*?adlcp:scormtype\s*=\s*["']sco["']/i)
        if (scoMatch) {
          launchFile = resolveInZip(scoMatch[1]) ?? scoMatch[1]
        } else {
          // Fallback: primeiro <resource com href que exista no ZIP
          const reRes = /<resource\b[^>]+\bhref\s*=\s*["']([^"'?#\s]+)["']/gi
          let mRes: RegExpExecArray | null
          while ((mRes = reRes.exec(text)) !== null) {
            const resolved = resolveInZip(mRes[1])
            if (resolved) { launchFile = resolved; break }
          }
        }
      }

      // 2) Se o manifest não ajudou, tenta candidatos conhecidos pelo caminho completo
      if (!launchFile) {
        const candidates = ['story_html5.html','story.html','index_lms.html','index.html','launch.html','blank.html']
        for (const c of candidates) {
          const found = resolveInZip(c)
          if (found) { launchFile = found; break }
        }
      }

      if (!launchFile) launchFile = 'index.html'

      // Faz upload de todos os arquivos extraídos para o Supabase Storage
      const uploadErrors: string[] = []
      const BATCH = 10
      for (let i = 0; i < files.length; i += BATCH) {
        await Promise.all(files.slice(i, i + BATCH).map(async (path) => {
          const blob = await zip.files[path].async('blob')
          const { error: upErr } = await supabase.storage
            .from('course-content')
            .upload(basePath + path, blob, { upsert: true, contentType: scormMime(path) })
          if (upErr) uploadErrors.push(`${path}: ${upErr.message}`)
        }))
      }

      if (uploadErrors.length > 0) {
        console.error('SCORM upload errors:', uploadErrors)
        throw new Error(`Falha no upload de ${uploadErrors.length} arquivo(s):\n${uploadErrors.slice(0, 5).join('\n')}`)
      }

      // Verifica se o arquivo de launch foi realmente armazenado
      const { error: verifyErr } = await supabase.storage
        .from('course-content')
        .download(basePath + launchFile)
      if (verifyErr) {
        throw new Error(
          `Arquivo de launch não encontrado após upload: ${basePath + launchFile}\n` +
          `Erro Supabase: ${verifyErr.message}\n\n` +
          `Arquivos no ZIP: ${files.slice(0, 10).join(', ')}`
        )
      }

      // content_url aponta para a rota proxy do Next.js (mesmo domínio)
      const proxyUrl = `/api/scorm/${lesson.id}/${launchFile}`

      // Persiste imediatamente no banco sem exigir clique em Salvar
      await updateLesson(lesson.id, courseId, { ...form, content_url: proxyUrl })
      setForm(f => ({ ...f, content_url: proxyUrl }))
      setUploadDone(true)
      onRefresh()
    } catch (err) {
      alert(`Erro no upload: ${err instanceof Error ? err.message : 'desconhecido'}`)
    }
    setUploading(false)
  }

  function handleSave() {
    start(async () => { await updateLesson(lesson.id, courseId, form); setOpen(false); onRefresh() })
  }

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-white/5 transition-colors">
        <span className="text-[var(--muted)]">{contentIcon(lesson.content_type)}</span>

        <span className="flex-1 text-xs text-[var(--text)] truncate cursor-pointer" onClick={() => setOpen(o => !o)}>
          {lesson.title}
        </span>

        {lesson.is_free_preview && (
          <span className="text-[10px] text-[var(--green)] font-bold">FREE</span>
        )}

        <div className="flex items-center gap-1">
          <button disabled={isFirst || pending} onClick={() => start(async () => { await moveLesson(lesson.id, moduleId, courseId, 'up'); onRefresh() })}
            className="p-1 text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-30 transition-colors">
            <ChevronUp size={12} />
          </button>
          <button disabled={isLast || pending} onClick={() => start(async () => { await moveLesson(lesson.id, moduleId, courseId, 'down'); onRefresh() })}
            className="p-1 text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-30 transition-colors">
            <ChevronDown size={12} />
          </button>
          <button onClick={() => setOpen(o => !o)}
            className={cn('p-1 text-[var(--muted)] hover:text-[var(--text)] transition-colors', open && 'text-[var(--green)]')}>
            <ChevronRight size={12} className={cn('transition-transform', open && 'rotate-90')} />
          </button>
          <button onClick={() => { if (confirm(`Excluir "${lesson.title}"?`)) start(async () => { await deleteLesson(lesson.id, courseId); onRefresh() }) }}
            className="p-1 text-[var(--muted)] hover:text-[var(--red)] transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Lesson form */}
      {open && (
        <div className="px-4 pb-4 pt-1 bg-[var(--bg)] border-t border-[var(--border)] space-y-3">
          <Input
            label="Título"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text)]">Descrição</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--text)]">Tipo de conteúdo</label>
              <select
                value={form.content_type}
                onChange={e => setForm(f => ({ ...f, content_type: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)]"
              >
                {CONTENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <Input
              label="Duração (segundos)"
              type="number" min="0"
              value={form.duration_seconds}
              onChange={e => setForm(f => ({ ...f, duration_seconds: e.target.value }))}
              placeholder="Ex: 600"
            />
          </div>

          {form.content_type === 'scorm' ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--text)]">Pacote SCORM (.zip)</label>
              <div
                className="border border-dashed border-[var(--border)] rounded-lg p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-[var(--green)] transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleScormUpload(f) }}
                />
                {uploading ? (
                  <span className="text-xs text-[var(--muted)] flex items-center gap-2">
                    <Upload size={14} className="animate-bounce" /> Enviando…
                  </span>
                ) : uploadDone || form.content_url ? (
                  <span className="text-xs text-[var(--green)] flex items-center gap-2">
                    <CheckCircle size={14} />
                    {uploadDone ? 'Upload concluído' : 'Pacote já enviado'}
                  </span>
                ) : (
                  <span className="text-xs text-[var(--muted)] flex items-center gap-2">
                    <Upload size={14} /> Clique para enviar o pacote .zip
                  </span>
                )}
              </div>
              {form.content_url && (
                <p className="text-[10px] text-[var(--muted)] truncate">{form.content_url}</p>
              )}
            </div>
          ) : form.content_type === 'quiz' ? (
            <QuizEditor lessonId={lesson.id} courseId={courseId} />
          ) : (
            <Input
              label="URL do conteúdo"
              value={form.content_url}
              onChange={e => setForm(f => ({ ...f, content_url: e.target.value }))}
              placeholder="https://..."
            />
          )}

          <div className="flex gap-5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_free_preview}
                onChange={e => setForm(f => ({ ...f, is_free_preview: e.target.checked }))}
                className="w-4 h-4 accent-[var(--green)]"
              />
              <span className="text-sm text-[var(--text)]">Preview gratuito</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.allow_download}
                onChange={e => setForm(f => ({ ...f, allow_download: e.target.checked }))}
                className="w-4 h-4 accent-[var(--green)]"
              />
              <span className="text-sm text-[var(--text)]">Permitir download</span>
            </label>
          </div>

          <div className="flex gap-2 pt-1">
            <Button size="sm" loading={pending} onClick={handleSave} className="gap-1.5">
              <Save size={12} />Salvar aula
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── QuizEditor ─────────────────────────────────────────────────────────

function QuizEditor({ lessonId, courseId }: { lessonId: string; courseId: string }) {
  const [loading, setLoading]           = useState(true)
  const [questions, setQuestions]       = useState<QuizQ[]>([])
  const [passingScore, setPassingScore] = useState(70)
  const [maxAttempts, setMaxAttempts]   = useState(3)
  const [saving, setSaving]             = useState(false)
  const [saved, setSaved]               = useState(false)

  useEffect(() => {
    fetch(`/api/quiz/${lessonId}`)
      .then(r => r.json())
      .then(({ quiz }) => {
        if (quiz) {
          setQuestions((quiz.questions as QuizQ[]).map(q => ({ ...q, explanation: q.explanation ?? '' })))
          setPassingScore(Number(quiz.passing_score))
          setMaxAttempts(Number(quiz.max_attempts))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [lessonId])

  function dirty() { setSaved(false) }

  function addQuestion() {
    setQuestions(qs => [...qs, {
      id: crypto.randomUUID(),
      text: '',
      options: [
        { id: crypto.randomUUID(), text: '' },
        { id: crypto.randomUUID(), text: '' },
      ],
      correct_option_id: '',
      explanation: '',
    }])
    dirty()
  }

  function removeQuestion(id: string) {
    setQuestions(qs => qs.filter(q => q.id !== id))
    dirty()
  }

  function updateQuestion(id: string, updates: Partial<QuizQ>) {
    setQuestions(qs => qs.map(q => q.id === id ? { ...q, ...updates } : q))
    dirty()
  }

  function updateOption(qId: string, optId: string, text: string) {
    setQuestions(qs => qs.map(q =>
      q.id === qId ? { ...q, options: q.options.map(o => o.id === optId ? { ...o, text } : o) } : q
    ))
    dirty()
  }

  function addOption(qId: string) {
    setQuestions(qs => qs.map(q =>
      q.id === qId ? { ...q, options: [...q.options, { id: crypto.randomUUID(), text: '' }] } : q
    ))
    dirty()
  }

  function removeOption(qId: string, optId: string) {
    setQuestions(qs => qs.map(q => {
      if (q.id !== qId) return q
      const options = q.options.filter(o => o.id !== optId)
      // Se a opção removida era a correta, limpa a seleção
      const correct = q.correct_option_id === optId ? '' : q.correct_option_id
      return { ...q, options, correct_option_id: correct }
    }))
    dirty()
  }

  async function handleSave() {
    setSaving(true)
    try {
      await saveQuiz(lessonId, courseId, {
        questions: questions.map(q => ({ ...q, explanation: q.explanation || null })),
        passing_score: passingScore,
        max_attempts:  maxAttempts,
      })
      setSaved(true)
    } catch {
      alert('Erro ao salvar quiz')
    }
    setSaving(false)
  }

  if (loading) return (
    <p className="text-xs text-[var(--muted)] py-2">Carregando quiz…</p>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[var(--text)]">Perguntas do quiz</label>
        <button
          type="button"
          onClick={addQuestion}
          className="text-xs text-[var(--green)] hover:underline flex items-center gap-1 transition-colors"
        >
          <Plus size={12} />Adicionar pergunta
        </button>
      </div>

      {questions.length === 0 && (
        <p className="text-xs text-[var(--muted)] py-1">Nenhuma pergunta ainda.</p>
      )}

      {questions.map((q, idx) => (
        <div key={q.id} className="border border-[var(--border)] rounded-lg p-3 space-y-2.5 bg-[var(--bg)]">
          {/* Enunciado */}
          <div className="flex items-start gap-2">
            <span className="text-xs text-[var(--muted)] mt-2 shrink-0">{idx + 1}.</span>
            <textarea
              rows={2}
              placeholder="Enunciado da pergunta"
              value={q.text}
              onChange={e => updateQuestion(q.id, { text: e.target.value })}
              className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--green)] resize-none"
            />
            <button
              type="button"
              onClick={() => removeQuestion(q.id)}
              className="text-[var(--muted)] hover:text-red-400 mt-1.5 shrink-0 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>

          {/* Opções */}
          <div className="ml-5 space-y-1.5">
            {q.options.map((opt, optIdx) => (
              <div key={opt.id} className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--muted)] w-4 shrink-0 text-right">
                  {String.fromCharCode(65 + optIdx)}.
                </span>
                <input
                  type="text"
                  placeholder={`Alternativa ${String.fromCharCode(65 + optIdx)}`}
                  value={opt.text}
                  onChange={e => updateOption(q.id, opt.id, e.target.value)}
                  className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--green)]"
                />
                {q.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(q.id, opt.id)}
                    className="text-[var(--muted)] hover:text-red-400 shrink-0 transition-colors"
                    title="Remover alternativa"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            {q.options.length < 6 && (
              <button
                type="button"
                onClick={() => addOption(q.id)}
                className="text-[10px] text-[var(--muted)] hover:text-[var(--green)] flex items-center gap-1 pt-0.5 transition-colors"
              >
                <Plus size={11} />Adicionar alternativa
              </button>
            )}
          </div>

          {/* Resposta correta + Explicação */}
          <div className="ml-5 space-y-1.5">
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-[var(--muted)] shrink-0">Resposta correta:</label>
              <select
                value={q.correct_option_id}
                onChange={e => updateQuestion(q.id, { correct_option_id: e.target.value })}
                className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
              >
                <option value="">— selecione —</option>
                {q.options.map((opt, optIdx) => (
                  <option key={opt.id} value={opt.id}>
                    {String.fromCharCode(65 + optIdx)}{opt.text ? `: ${opt.text.slice(0, 40)}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="text"
              placeholder="Explicação da resposta correta (opcional)"
              value={q.explanation}
              onChange={e => updateQuestion(q.id, { explanation: e.target.value })}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--green)] italic"
            />
          </div>
        </div>
      ))}

      {/* Configurações */}
      <div className="flex gap-4 pt-1">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--muted)]">Nota mínima (%)</label>
          <input
            type="number" min="0" max="100"
            value={passingScore}
            onChange={e => { setPassingScore(Number(e.target.value)); dirty() }}
            className="w-24 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--muted)]">Máx. tentativas</label>
          <input
            type="number" min="1" max="99"
            value={maxAttempts}
            onChange={e => { setMaxAttempts(Number(e.target.value)); dirty() }}
            className="w-24 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" variant="secondary" loading={saving} onClick={handleSave} className="gap-1.5">
          <Save size={12} />{saved ? 'Quiz salvo!' : 'Salvar quiz'}
        </Button>
        {saved && <CheckCircle size={14} className="text-[var(--green)]" />}
      </div>
    </div>
  )
}
