'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { Role } from '@/types/database'

const ROLES: Role[] = ['aluno', 'professor', 'coordenador', 'admin']

type ActionResult = { ok: true } | { ok: false; error: string }

/** Garante que quem chamou é admin e devolve o id do admin atual. */
async function requireAdmin(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: Role }>()

  if (!profile || profile.role !== 'admin') throw new Error('Acesso negado')
  return user.id
}

function isValidRole(role: string): role is Role {
  return (ROLES as string[]).includes(role)
}

export async function createUser(input: {
  name: string
  email: string
  password: string
  role: Role
}): Promise<ActionResult> {
  try {
    await requireAdmin()

    const name = input.name.trim()
    const email = input.email.trim().toLowerCase()
    if (!name) return { ok: false, error: 'Informe o nome.' }
    if (!email) return { ok: false, error: 'Informe o email.' }
    if (input.password.length < 6) return { ok: false, error: 'A senha precisa ter ao menos 6 caracteres.' }
    if (!isValidRole(input.role)) return { ok: false, error: 'Papel inválido.' }

    const admin = createAdminClient()
    // O trigger handle_new_user cria o profile lendo name/role do metadata.
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: { name, role: input.role },
    })

    if (error) {
      return { ok: false, error: error.message }
    }

    // Garante name/role no profile mesmo que o cast do trigger falhe.
    if (data.user) {
      await admin.from('profiles')
        .update({ name, role: input.role, updated_at: new Date().toISOString() })
        .eq('id', data.user.id)
    }

    revalidatePath('/admin/users')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

export async function updateUser(input: {
  id: string
  name: string
  role: Role
}): Promise<ActionResult> {
  try {
    const adminId = await requireAdmin()

    const name = input.name.trim()
    if (!name) return { ok: false, error: 'Informe o nome.' }
    if (!isValidRole(input.role)) return { ok: false, error: 'Papel inválido.' }
    if (input.id === adminId && input.role !== 'admin') {
      return { ok: false, error: 'Você não pode remover seu próprio acesso de admin.' }
    }

    const admin = createAdminClient()
    const { error } = await admin.from('profiles')
      .update({ name, role: input.role, updated_at: new Date().toISOString() })
      .eq('id', input.id)

    if (error) return { ok: false, error: error.message }

    revalidatePath('/admin/users')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

export async function setUserActive(input: {
  id: string
  active: boolean
}): Promise<ActionResult> {
  try {
    const adminId = await requireAdmin()

    if (input.id === adminId && !input.active) {
      return { ok: false, error: 'Você não pode desativar a própria conta.' }
    }

    const admin = createAdminClient()
    // Bane (ou libera) o login na auth e reflete o status no profile.
    const { error: banError } = await admin.auth.admin.updateUserById(input.id, {
      ban_duration: input.active ? 'none' : '876600h', // ~100 anos
    })
    if (banError) return { ok: false, error: banError.message }

    const { error } = await admin.from('profiles')
      .update({ is_active: input.active, updated_at: new Date().toISOString() })
      .eq('id', input.id)
    if (error) return { ok: false, error: error.message }

    revalidatePath('/admin/users')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

export async function resetUserPassword(input: {
  id: string
  password: string
}): Promise<ActionResult> {
  try {
    await requireAdmin()
    if (input.password.length < 6) return { ok: false, error: 'A senha precisa ter ao menos 6 caracteres.' }

    const admin = createAdminClient()
    const { error } = await admin.auth.admin.updateUserById(input.id, { password: input.password })
    if (error) return { ok: false, error: error.message }

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

export type AdminUserRow = {
  id: string
  name: string
  email: string
  role: Role
  avatar_url: string | null
  is_active: boolean
  created_at: string
  total_xp: number
  level: number
}

type ListResult =
  | { ok: true; users: AdminUserRow[]; total: number }
  | { ok: false; error: string }

export async function listUsers(input: {
  query?: string
  role?: Role | 'all'
  status?: 'all' | 'active' | 'inactive'
  offset?: number
  limit?: number
}): Promise<ListResult> {
  try {
    await requireAdmin()
    const admin = createAdminClient()

    const limit = input.limit ?? 20
    const offset = input.offset ?? 0

    let q = admin
      .from('profiles')
      .select(
        'id, name, email, role, avatar_url, is_active, created_at, user_xp(total_xp, level)',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const term = (input.query ?? '').trim().replace(/[%,()*]/g, ' ').trim()
    if (term) q = q.or(`name.ilike.%${term}%,email.ilike.%${term}%`)
    if (input.role && input.role !== 'all') q = q.eq('role', input.role)
    if (input.status && input.status !== 'all') q = q.eq('is_active', input.status === 'active')

    const { data, error, count } = await q
    if (error) return { ok: false, error: error.message }

    const users: AdminUserRow[] = (data ?? []).map((u: Record<string, unknown>) => {
      const raw = u.user_xp as { total_xp: number; level: number } | { total_xp: number; level: number }[] | null
      const xp = Array.isArray(raw) ? raw[0] : raw
      return {
        id: u.id as string,
        name: u.name as string,
        email: u.email as string,
        role: u.role as Role,
        avatar_url: (u.avatar_url as string | null) ?? null,
        is_active: u.is_active as boolean,
        created_at: u.created_at as string,
        total_xp: xp?.total_xp ?? 0,
        level: xp?.level ?? 1,
      }
    })

    return { ok: true, users, total: count ?? 0 }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}
