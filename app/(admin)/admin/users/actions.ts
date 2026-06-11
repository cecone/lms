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
