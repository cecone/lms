import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { lessonId } = await req.json() as { lessonId: string }
  if (!lessonId) return new NextResponse('Missing lessonId', { status: 400 })

  const { data: issued, error } = await supabase.rpc('maybe_issue_certificate', {
    p_user_id:  user.id,
    p_lesson_id: lessonId,
  })

  if (error) return NextResponse.json({ issued: false, error: error.message })
  return NextResponse.json({ issued: !!issued })
}
