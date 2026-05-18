'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(data: {
  name: string
  bio: string
  avatar_url: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  await supabase.from('profiles').update({
    name:       data.name.trim() || 'Usuário',
    bio:        data.bio.trim() || null,
    avatar_url: data.avatar_url.trim() || null,
    updated_at: new Date().toISOString(),
  }).eq('id', user.id)

  revalidatePath('/profile')
  revalidatePath('/')
}
