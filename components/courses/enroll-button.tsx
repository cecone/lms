'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { BookOpen } from 'lucide-react'

interface EnrollButtonProps {
  courseId: string
  userId: string
}

export function EnrollButton({ courseId, userId }: EnrollButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleEnroll() {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('enrollments').insert({ user_id: userId, course_id: courseId })
    router.refresh()
    setLoading(false)
  }

  return (
    <Button onClick={handleEnroll} loading={loading} size="lg" className="gap-2">
      <BookOpen size={17} />
      Matricular-se gratuitamente
    </Button>
  )
}
