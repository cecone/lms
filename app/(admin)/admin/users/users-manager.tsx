'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Pencil, UserX, UserCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Profile, Role } from '@/types/database'
import { createUser, updateUser, setUserActive } from './actions'

const ROLE_META: Record<Role, { label: string; variant: 'green' | 'blue' | 'amber' | 'muted' }> = {
  aluno:       { label: 'Aluno',       variant: 'muted' },
  professor:   { label: 'Professor',   variant: 'blue' },
  coordenador: { label: 'Coordenador', variant: 'amber' },
  admin:       { label: 'Admin',       variant: 'green' },
}

const ROLES = Object.keys(ROLE_META) as Role[]

type StatusFilter = 'all' | 'active' | 'inactive'

const inputClass =
  'w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--green)]'

export function UsersManager({
  initialUsers,
  currentUserId,
}: {
  initialUsers: Profile[]
  currentUserId: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [editing, setEditing] = useState<Profile | null>(null)
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return initialUsers.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (statusFilter === 'active' && !u.is_active) return false
      if (statusFilter === 'inactive' && u.is_active) return false
      if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
      return true
    })
  }, [initialUsers, query, roleFilter, statusFilter])

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            className={`${inputClass} pl-9`}
            placeholder="Buscar por nome ou email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]"
              aria-label="Limpar busca"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus size={14} /> Novo usuário
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-5 text-xs">
        <FilterGroup
          options={[['all', 'Todos'], ...ROLES.map((r) => [r, ROLE_META[r].label] as [string, string])]}
          value={roleFilter}
          onChange={(v) => setRoleFilter(v as Role | 'all')}
        />
        <span className="w-px bg-[var(--border)] mx-1" />
        <FilterGroup
          options={[['all', 'Todos'], ['active', 'Ativos'], ['inactive', 'Inativos']]}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
        />
      </div>

      <p className="text-xs text-[var(--muted)] mb-3">
        {filtered.length} {filtered.length === 1 ? 'usuário' : 'usuários'}
      </p>

      {/* Lista */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-sm text-[var(--muted)] text-center py-10">Nenhum usuário encontrado.</p>
        )}
        {filtered.map((u) => (
          <UserRow
            key={u.id}
            user={u}
            isSelf={u.id === currentUserId}
            onEdit={() => setEditing(u)}
            onChanged={() => router.refresh()}
          />
        ))}
      </div>

      {creating && (
        <CreateModal onClose={() => setCreating(false)} onDone={() => { setCreating(false); router.refresh() }} />
      )}
      {editing && (
        <EditModal
          user={editing}
          isSelf={editing.id === currentUserId}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); router.refresh() }}
        />
      )}
    </div>
  )
}

function FilterGroup({
  options, value, onChange,
}: {
  options: [string, string][]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="inline-flex flex-wrap gap-1">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
            value === v
              ? 'bg-[var(--green)]/10 text-[var(--green)]'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function UserRow({
  user, isSelf, onEdit, onChanged,
}: {
  user: Profile
  isSelf: boolean
  onEdit: () => void
  onChanged: () => void
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const meta = ROLE_META[user.role]

  function toggleActive() {
    setError(null)
    if (user.is_active) {
      // desativando — confirma
      if (!confirm(`Desativar ${user.name}? O usuário perderá o acesso, mas o histórico será mantido.`)) return
    }
    start(async () => {
      const res = await setUserActive({ id: user.id, active: !user.is_active })
      if (!res.ok) setError(res.error)
      else onChanged()
    })
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 flex items-center gap-4">
      {user.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-[var(--green)]/20 flex items-center justify-center text-xs font-bold text-[var(--green)] flex-shrink-0">
          {user.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text)] truncate">
          {user.name}
          {isSelf && <span className="text-[var(--muted)] font-normal"> (você)</span>}
        </p>
        <p className="text-xs text-[var(--muted)] truncate">{user.email}</p>
        {error && <p className="text-xs text-[var(--red)] mt-1">{error}</p>}
      </div>
      <Badge variant={meta.variant}>{meta.label}</Badge>
      {!user.is_active && <Badge variant="red">Inativo</Badge>}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onEdit}
          className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5 transition-colors"
          aria-label={`Editar ${user.name}`}
        >
          <Pencil size={15} />
        </button>
        <button
          onClick={toggleActive}
          disabled={pending}
          className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
            user.is_active
              ? 'text-[var(--muted)] hover:text-[var(--red)] hover:bg-[var(--red)]/10'
              : 'text-[var(--muted)] hover:text-[var(--green)] hover:bg-[var(--green)]/10'
          }`}
          aria-label={user.is_active ? `Desativar ${user.name}` : `Reativar ${user.name}`}
        >
          {user.is_active ? <UserX size={15} /> : <UserCheck size={15} />}
        </button>
      </div>
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[var(--text)]">{title}</h2>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--text)]" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-[var(--muted)]">{label}</label>
      {children}
    </div>
  )
}

function CreateModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('aluno')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit() {
    setError(null)
    start(async () => {
      const res = await createUser({ name, email, password, role })
      if (!res.ok) setError(res.error)
      else onDone()
    })
  }

  return (
    <Modal title="Novo usuário" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Nome">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Maria Silva" />
        </Field>
        <Field label="Email">
          <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maria@exemplo.com" />
        </Field>
        <Field label="Senha (mín. 6 caracteres)">
          <input className={inputClass} type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
        </Field>
        <Field label="Papel">
          <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
          </select>
        </Field>
        {error && <p className="text-sm text-[var(--red)]">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={submit} loading={pending} disabled={pending}>Criar usuário</Button>
          <Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </Modal>
  )
}

function EditModal({
  user, isSelf, onClose, onDone,
}: {
  user: Profile
  isSelf: boolean
  onClose: () => void
  onDone: () => void
}) {
  const [name, setName] = useState(user.name)
  const [role, setRole] = useState<Role>(user.role)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit() {
    setError(null)
    start(async () => {
      const res = await updateUser({ id: user.id, name, role })
      if (!res.ok) setError(res.error)
      else onDone()
    })
  }

  return (
    <Modal title="Editar usuário" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Nome">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email">
          <input className={`${inputClass} opacity-60`} value={user.email} disabled />
        </Field>
        <Field label="Papel">
          <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={isSelf}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
          </select>
        </Field>
        {isSelf && <p className="text-xs text-[var(--muted)]">Você não pode alterar o próprio papel.</p>}
        {error && <p className="text-sm text-[var(--red)]">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={submit} loading={pending} disabled={pending}>Salvar</Button>
          <Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </Modal>
  )
}
