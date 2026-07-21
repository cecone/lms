'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Trash2, Plus, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'

type TriggerType = 'lesson_complete' | 'course_complete' | 'streak' | 'xp_reached' | 'quiz_perfect'

const TRIGGER_LABELS: Record<TriggerType, string> = {
  lesson_complete:  'Aulas concluídas',
  course_complete:  'Curso concluído',
  streak:           'Streak (dias)',
  xp_reached:       'XP acumulado',
  quiz_perfect:     'Quizzes perfeitos',
}

type Badge = {
  id: string
  name: string
  description: string
  trigger_type: TriggerType
  trigger_value: number
  course_id: string | null
  icon_url: string | null
}

type Course = { id: string; title: string }

const BLANK: Omit<Badge, 'id'> = {
  name: '', description: '', trigger_type: 'lesson_complete',
  trigger_value: 1, course_id: null, icon_url: null,
}

const inputClass =
  'w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] ' +
  'focus:outline-none focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)]'

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green)] ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]'

export default function BadgesAdminPage() {
  const supabase = useMemo(() => createClient(), [])
  const [badges, setBadges]   = useState<Badge[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [form, setForm]       = useState<Omit<Badge, 'id'>>(BLANK)
  const [pending, start]      = useTransition()

  const load = useCallback(async () => {
    const [{ data: b }, { data: c }] = await Promise.all([
      supabase.from('badges').select('*').order('trigger_type').order('trigger_value'),
      supabase.from('courses').select('id, title').eq('status', 'published').order('title'),
    ])
    setBadges((b ?? []) as Badge[])
    setCourses((c ?? []) as Course[])
  }, [supabase])

  useEffect(() => { load() }, [load])

  const needsCourse = form.trigger_type === 'course_complete'
  // course_complete sem curso nunca é concedido (regra do SQL) → exige curso
  const canSubmit = form.name.trim() !== '' && !(needsCourse && !form.course_id)

  function handleCreate() {
    if (!canSubmit) return
    start(async () => {
      await supabase.from('badges').insert({
        name:          form.name.trim(),
        description:   form.description.trim(),
        trigger_type:  form.trigger_type,
        trigger_value: form.trigger_value,
        course_id:     form.course_id || null,
        icon_url:      form.icon_url || null,
      })
      setForm(BLANK)
      await load()
    })
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir o badge "${name}"? Alunos que já o conquistaram perderão o registro.`)) return
    start(async () => {
      await supabase.from('badges').delete().eq('id', id)
      await load()
    })
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl">
      {/* Header */}
      <header className="mb-8 flex items-center gap-3">
        <Trophy size={22} className="text-[var(--amber)]" aria-hidden />
        <div>
          <h1 className="text-[26px] leading-tight font-medium tracking-tight text-[var(--text)]">Badges</h1>
          <p className="text-sm text-[var(--muted)]">Gerencie as conquistas da plataforma</p>
        </div>
      </header>

      {/* Formulário */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 mb-8 space-y-4">
        <h2 className="text-sm font-medium text-[var(--text)]">Novo badge</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--muted)]">Nome</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Primeira aula"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--muted)]">Descrição</label>
            <input
              className={inputClass}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Ex: Conclua sua primeira aula"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--muted)]">Gatilho</label>
            <select
              className={inputClass}
              value={form.trigger_type}
              onChange={e => setForm(f => ({ ...f, trigger_type: e.target.value as TriggerType, course_id: null }))}
            >
              {Object.entries(TRIGGER_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--muted)]">
              {needsCourse ? 'Curso' : 'Valor (quantidade)'}
            </label>
            {needsCourse ? (
              <select
                className={inputClass}
                value={form.course_id ?? ''}
                onChange={e => setForm(f => ({ ...f, course_id: e.target.value || null }))}
              >
                <option value="">Selecione um curso…</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            ) : (
              <input
                type="number" min={1}
                className={inputClass}
                value={form.trigger_value}
                onChange={e => setForm(f => ({ ...f, trigger_value: parseInt(e.target.value) || 1 }))}
              />
            )}
          </div>
          {form.trigger_type === 'lesson_complete' && (
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs text-[var(--muted)]">Curso específico (opcional — deixe em branco para qualquer curso)</label>
              <select
                className={inputClass}
                value={form.course_id ?? ''}
                onChange={e => setForm(f => ({ ...f, course_id: e.target.value || null }))}
              >
                <option value="">Qualquer curso</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          )}
        </div>
        {needsCourse && !form.course_id && (
          <p className="text-xs text-[var(--amber)]">
            Badges de conclusão de curso exigem um curso selecionado — sem isso, nunca seriam concedidos.
          </p>
        )}
        <Button size="sm" onClick={handleCreate} disabled={pending || !canSubmit}>
          <Plus size={14} /> Criar badge
        </Button>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {badges.length === 0 && (
          <p className="text-sm text-[var(--muted)] text-center py-8">Nenhum badge cadastrado.</p>
        )}
        {badges.map(b => (
          <div key={b.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[var(--amber)]/15 flex items-center justify-center shrink-0 overflow-hidden">
              {b.icon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.icon_url} alt="" className="w-7 h-7 object-contain" />
              ) : (
                <Award size={18} className="text-[var(--amber)]" aria-hidden />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text)] truncate">{b.name}</p>
              <p className="text-xs text-[var(--muted)] truncate">{b.description}</p>
            </div>
            <span className="text-xs text-[var(--muted)] whitespace-nowrap tabular-nums">
              {TRIGGER_LABELS[b.trigger_type]} ≥ {b.trigger_value}
            </span>
            <button
              onClick={() => handleDelete(b.id, b.name)}
              disabled={pending}
              aria-label={`Excluir ${b.name}`}
              className={`p-2 rounded-lg text-[var(--muted)] hover:text-[var(--red)] hover:bg-[var(--red)]/10 transition-colors disabled:opacity-50 ${focusRing}`}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
