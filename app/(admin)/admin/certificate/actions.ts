'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_CERTIFICATE_SETTINGS } from '@/lib/certificate-settings'
import { revalidatePath } from 'next/cache'
import type { CertificateSettings, Role } from '@/types/database'

type ActionResult = { ok: true } | { ok: false; error: string }

/** Garante que quem chamou é admin. */
async function requireAdmin(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: Role }>()

  if (!profile || profile.role !== 'admin') throw new Error('Acesso negado')
}

export async function getCertificateSettings(): Promise<CertificateSettings> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('certificate_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle<CertificateSettings>()

  return data ?? DEFAULT_CERTIFICATE_SETTINGS
}

/** Campos editáveis pelo admin. */
export type CertificateSettingsInput = Omit<CertificateSettings, 'id' | 'updated_at'>

/** Converte string vazia em null (para colunas anuláveis). */
function nullify(v: string | null): string | null {
  const t = (v ?? '').trim()
  return t === '' ? null : t
}

export async function updateCertificateSettings(
  input: CertificateSettingsInput,
): Promise<ActionResult> {
  try {
    await requireAdmin()

    const institution_name = input.institution_name.trim()
    const title = input.title.trim()
    const intro_text = input.intro_text.trim()
    const middle_text = input.middle_text.trim()
    const brand_color = input.brand_color.trim()
    const verify_url_base = input.verify_url_base.trim()

    if (!institution_name) return { ok: false, error: 'Informe o nome da instituição.' }
    if (!title) return { ok: false, error: 'Informe o título do certificado.' }
    if (!/^#[0-9a-fA-F]{6}$/.test(brand_color)) {
      return { ok: false, error: 'A cor da marca deve estar no formato hexadecimal (ex.: #22c55e).' }
    }
    if (!verify_url_base) return { ok: false, error: 'Informe a base da URL de verificação.' }

    const admin = createAdminClient()
    const { error } = await admin
      .from('certificate_settings')
      .upsert({
        id: 1,
        institution_name,
        logo_url: nullify(input.logo_url),
        brand_color,
        title,
        intro_text: intro_text || DEFAULT_CERTIFICATE_SETTINGS.intro_text,
        middle_text: middle_text || DEFAULT_CERTIFICATE_SETTINGS.middle_text,
        footer_text: nullify(input.footer_text),
        signature_name: nullify(input.signature_name),
        signature_role: nullify(input.signature_role),
        signature_image_url: nullify(input.signature_image_url),
        verify_url_base,
        updated_at: new Date().toISOString(),
      })

    if (error) return { ok: false, error: error.message }

    // Revalida as telas que renderizam o certificado.
    revalidatePath('/admin/certificate')
    revalidatePath('/courses/[id]/certificate', 'page')
    revalidatePath('/verify/[code]', 'page')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}
