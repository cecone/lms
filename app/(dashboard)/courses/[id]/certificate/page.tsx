import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CertificateView } from './certificate-view'

export default async function CertificatePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: cert }, { data: course }, { data: profile }] = await Promise.all([
    supabase
      .from('certificates')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', params.id)
      .maybeSingle(),
    supabase
      .from('courses')
      .select('id, title, description, accent_color')
      .eq('id', params.id)
      .single(),
    supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single(),
  ])

  if (!cert || !course || !profile) notFound()

  return (
    <CertificateView
      studentName={profile.name}
      courseTitle={course.title}
      accentColor={course.accent_color}
      issuedAt={cert.issued_at}
      verificationCode={cert.verification_code}
      courseId={params.id}
    />
  )
}
