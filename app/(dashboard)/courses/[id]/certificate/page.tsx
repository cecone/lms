import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_CERTIFICATE_SETTINGS } from '@/lib/certificate-settings'
import type { CertificateSettings } from '@/types/database'
import { CertificateView } from './certificate-view'

export default async function CertificatePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: cert }, { data: course }, { data: profile }, { data: settings }] = await Promise.all([
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
    supabase
      .from('certificate_settings')
      .select('*')
      .eq('id', 1)
      .single<CertificateSettings>(),
  ])

  if (!cert || !course || !profile) notFound()

  const resolved = settings ?? DEFAULT_CERTIFICATE_SETTINGS

  return (
    <CertificateView
      studentName={profile.name}
      courseTitle={course.title}
      accentColor={course.accent_color || resolved.brand_color}
      issuedAt={cert.issued_at}
      verificationCode={cert.verification_code}
      courseId={params.id}
      settings={resolved}
    />
  )
}
