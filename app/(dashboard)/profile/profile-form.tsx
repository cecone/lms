'use client'

import { useState, useRef, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateProfile } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Camera, Save, X, Zap, Flame, BookOpen, CheckCircle } from 'lucide-react'

const ROLE_LABEL: Record<string, string> = {
  aluno: 'Aluno', professor: 'Professor',
  coordenador: 'Coordenador', admin: 'Administrador',
}
const ROLE_VARIANT: Record<string, 'muted' | 'green' | 'blue' | 'amber'> = {
  aluno: 'muted', professor: 'blue', coordenador: 'amber', admin: 'green',
}

interface Props {
  profile: { id: string; name: string; email: string; bio: string | null; avatar_url: string | null; role: string }
  xp: { total_xp: number; level: number; streak_days: number } | null
  enrolledCount: number
  completedCount: number
  supabaseUrl: string
}

export function ProfileForm({ profile, xp, enrolledCount, completedCount, supabaseUrl }: Props) {
  const [editing, setEditing]     = useState(false)
  const [pending, start]          = useTransition()
  const [uploading, setUploading] = useState(false)
  const [form, setForm]           = useState({
    name:       profile.name,
    bio:        profile.bio ?? '',
    avatar_url: profile.avatar_url ?? '',
  })
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleAvatarUpload(file: File) {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    try {
      const supabase = createClient()
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `avatars/${profile.id}.${ext}`
      await supabase.storage
        .from('course-content')
        .upload(path, file, { upsert: true, contentType: file.type })
      const url = `${supabaseUrl}/storage/v1/object/public/course-content/${path}`
      setForm(f => ({ ...f, avatar_url: url }))
    } catch {
      alert('Erro ao enviar imagem')
    }
    setUploading(false)
  }

  function handleSave() {
    start(async () => {
      await updateProfile(form)
      setEditing(false)
    })
  }

  function handleCancel() {
    setForm({ name: profile.name, bio: profile.bio ?? '', avatar_url: profile.avatar_url ?? '' })
    setEditing(false)
  }

  const initials = profile.name.slice(0, 2).toUpperCase()
  const avatarSrc = editing ? form.avatar_url : profile.avatar_url

  return (
    <div className="space-y-6">
      {/* Card principal */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={profile.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-[var(--border)]"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[var(--green)]/20 flex items-center justify-center text-2xl font-bold text-[var(--green)] border-2 border-[var(--border)]">
                {initials}
              </div>
            )}
            {editing && (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                >
                  <Camera size={18} className="text-white" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f) }}
                />
                {uploading && (
                  <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-3">
            {editing ? (
              <>
                <Input
                  label="Nome"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[var(--text)]">Bio</label>
                  <textarea
                    rows={3}
                    placeholder="Conte um pouco sobre você…"
                    value={form.bio}
                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)] resize-none"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-[var(--text)]">{profile.name}</h2>
                    <Badge variant={ROLE_VARIANT[profile.role] ?? 'muted'}>
                      {ROLE_LABEL[profile.role] ?? profile.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-[var(--muted)] mt-0.5">{profile.email}</p>
                </div>
                {profile.bio && (
                  <p className="text-sm text-[var(--muted)] leading-relaxed">{profile.bio}</p>
                )}
              </>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              {editing ? (
                <>
                  <Button size="sm" loading={pending} onClick={handleSave} className="gap-1.5">
                    <Save size={13} />Salvar
                  </Button>
                  <Button size="sm" variant="ghost" disabled={pending} onClick={handleCancel} className="gap-1.5">
                    <X size={13} />Cancelar
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                  Editar perfil
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'XP Total',
            value: (xp?.total_xp ?? 0).toLocaleString('pt-BR'),
            icon: <Zap size={16} className="text-[var(--amber)]" />,
          },
          {
            label: 'Nível',
            value: xp?.level ?? 1,
            icon: <div className="w-4 h-4 rounded-full bg-[var(--green)]/20 flex items-center justify-center text-[8px] font-bold text-[var(--green)]">Lv</div>,
          },
          {
            label: 'Streak',
            value: `${xp?.streak_days ?? 0}d`,
            icon: <Flame size={16} className="text-orange-400" />,
          },
          {
            label: 'Cursos',
            value: enrolledCount,
            icon: <BookOpen size={16} className="text-[var(--blue)]" />,
          },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-2">
            {icon}
            <p className="text-2xl font-bold text-[var(--text)]">{value}</p>
            <p className="text-xs text-[var(--muted)]">{label}</p>
          </div>
        ))}
      </div>

      {/* Progresso */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
            <CheckCircle size={15} className="text-[var(--green)]" />
            Aulas concluídas
          </h3>
          <span className="text-2xl font-bold text-[var(--text)]">{completedCount}</span>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Total de aulas que você completou na plataforma.
        </p>
      </div>
    </div>
  )
}
