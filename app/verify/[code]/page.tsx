import { createClient } from '@/lib/supabase/server'
import { CheckCircle, XCircle, Award } from 'lucide-react'
import Link from 'next/link'

interface CertData {
  valid: boolean
  student_name?: string
  course_title?: string
  issued_at?: string
  verification_code?: string
}

export default async function VerifyPage({ params }: { params: { code: string } }) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('verify_certificate', {
    p_code: params.code.toUpperCase(),
  })

  const cert = (error ? { valid: false } : data) as CertData

  const date = cert.issued_at
    ? new Date(cert.issued_at).toLocaleDateString('pt-BR', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-xl font-black tracking-tight text-[var(--green)]">
            learn·studio
          </Link>
          <p className="text-xs text-[var(--muted)] mt-1">Verificação de certificado</p>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
          {cert.valid ? (
            <>
              {/* Valid */}
              <div className="bg-[var(--green)]/10 border-b border-[var(--green)]/20 px-6 py-5 flex items-center gap-3">
                <CheckCircle size={22} className="text-[var(--green)] shrink-0" />
                <div>
                  <p className="font-semibold text-[var(--green)]">Certificado válido</p>
                  <p className="text-xs text-[var(--green)]/70">Este certificado é autêntico</p>
                </div>
              </div>

              <div className="px-6 py-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[var(--green)]/10 flex items-center justify-center shrink-0">
                    <Award size={22} className="text-[var(--green)]" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Aluno</p>
                    <p className="font-bold text-[var(--text)] text-lg">{cert.student_name}</p>
                  </div>
                </div>

                <div className="bg-[var(--bg)] rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-xs text-[var(--muted)] mb-0.5">Curso</p>
                    <p className="font-semibold text-[var(--text)]">{cert.course_title}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)] mb-0.5">Data de conclusão</p>
                    <p className="text-sm text-[var(--text)]">{date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)] mb-0.5">Código</p>
                    <p className="font-mono text-sm text-[var(--text)] tracking-widest">
                      {cert.verification_code}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Invalid */}
              <div className="bg-[var(--red)]/10 border-b border-[var(--red)]/20 px-6 py-5 flex items-center gap-3">
                <XCircle size={22} className="text-[var(--red)] shrink-0" />
                <div>
                  <p className="font-semibold text-[var(--red)]">Certificado não encontrado</p>
                  <p className="text-xs text-[var(--red)]/70">
                    O código &quot;{params.code.toUpperCase()}&quot; não é válido
                  </p>
                </div>
              </div>
              <div className="px-6 py-6">
                <p className="text-sm text-[var(--muted)]">
                  Verifique se o código foi digitado corretamente. Se o problema persistir,
                  entre em contato com a instituição emissora.
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-[var(--muted)] mt-6">
          <Link href="/" className="hover:text-[var(--text)] transition-colors">
            Acessar a plataforma →
          </Link>
        </p>
      </div>
    </div>
  )
}
