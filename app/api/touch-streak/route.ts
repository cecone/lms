import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  await supabase.rpc('touch_streak', { p_user_id: user.id })
  return new NextResponse(null, { status: 204 })
}
