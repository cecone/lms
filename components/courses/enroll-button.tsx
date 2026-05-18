'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { enrollInCourse } from '@/app/actions/enroll'
import { Button } from '@/components/ui/button'
import { BookOpen } from 'lucide-react'

interface EnrollButtonProps {
  courseId: string
  userId: string
}

export function EnrollButton({ courseId }: EnrollButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleEnroll() {
    setLoading(true)
    await enrollInCourse(courseId)
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
