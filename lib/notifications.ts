import type { SupabaseClient } from '@supabase/supabase-js'

interface NotificationPayload {
  userId: string
  type: string
  title: string
  body?: string
  link?: string
}

/** Fire-and-forget — errors are swallowed so they never break the main flow. */
export async function createNotification(
  supabase: SupabaseClient,
  payload: NotificationPayload
) {
  await supabase.from('notifications').insert({
    user_id: payload.userId,
    type:    payload.type,
    title:   payload.title,
    body:    payload.body ?? null,
    link:    payload.link ?? null,
  })
}
