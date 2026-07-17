'use client'

import Link from 'next/link'
import { ArrowLeft, Printer, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CertificateSettings } from '@/types/database'

interface Props {
  studentName: string
  courseTitle: string
  accentColor: string
  issuedAt: string
  verificationCode: string
  courseId: string
  settings: CertificateSettings
  /** Esconde a navegação/impressão e o link de verificação (usado no preview do admin). */
  showActions?: boolean
}

export function CertificateView({
  studentName,
  courseTitle,
  accentColor,
  issuedAt,
  verificationCode,
  courseId,
  settings,
  showActions = true,
}: Props) {
  const date = new Date(issuedAt).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const verifyUrl = `${settings.verify_url_base.replace(/\/$/, '')}/${verificationCode}`
  const hasSignature = !!(settings.signature_name || settings.signature_image_url)

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #certificate, #certificate * { visibility: visible !important; }
          #certificate { position: fixed !important; inset: 0 !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="p-6 md:p-10 max-w-4xl">
        {/* Nav — hidden on print / preview */}
        {showActions && (
          <div className="flex items-center justify-between mb-8 no-print">
            <Link href={`/courses/${courseId}`}>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ArrowLeft size={15} />
                Voltar ao curso
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={() => window.print()}
            >
              <Printer size={14} />
              Imprimir / Salvar PDF
            </Button>
          </div>
        )}

        {/* Certificate */}
        <div
          id="certificate"
          className="relative bg-white rounded-2xl overflow-hidden shadow-xl"
          style={{ border: `3px solid ${accentColor}` }}
        >
          {/* Top accent bar */}
          <div className="h-2 w-full" style={{ backgroundColor: accentColor }} />

          {/* Corner decorations */}
          <div
            className="absolute top-6 left-6 w-16 h-16 rounded-full opacity-10"
            style={{ backgroundColor: accentColor }}
          />
          <div
            className="absolute bottom-10 right-6 w-24 h-24 rounded-full opacity-10"
            style={{ backgroundColor: accentColor }}
          />

          <div className="px-12 py-12 text-center relative">
            {/* Logo + institution */}
            <div className="flex flex-col items-center gap-3 mb-8">
              {settings.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.logo_url} alt={settings.institution_name} className="h-16 object-contain" />
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: accentColor + '20' }}
                >
                  <Award size={32} style={{ color: accentColor }} />
                </div>
              )}
              <span className="text-lg font-black tracking-tight" style={{ color: accentColor }}>
                {settings.institution_name}
              </span>
            </div>

            {/* Title */}
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 mb-2">
              {settings.title}
            </p>
            <div className="w-16 h-0.5 mx-auto mb-8" style={{ backgroundColor: accentColor }} />

            {/* Body */}
            <p className="text-base text-gray-500 mb-3">{settings.intro_text}</p>
            <h1 className="text-4xl font-black text-gray-800 mb-4 tracking-tight">
              {studentName}
            </h1>
            <p className="text-base text-gray-500 mb-3">{settings.middle_text}</p>
            <h2
              className="text-2xl font-bold mb-8"
              style={{ color: accentColor }}
            >
              {courseTitle}
            </h2>

            <p className="text-sm text-gray-400 mb-10">
              Concluído em {date}
            </p>

            {/* Signature */}
            {hasSignature && (
              <div className="flex flex-col items-center gap-1 mb-10">
                {settings.signature_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settings.signature_image_url} alt="" className="h-14 object-contain mb-1" />
                )}
                <div className="w-56 h-px bg-gray-300" />
                {settings.signature_name && (
                  <p className="text-sm font-semibold text-gray-700">{settings.signature_name}</p>
                )}
                {settings.signature_role && (
                  <p className="text-xs text-gray-400">{settings.signature_role}</p>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="w-32 h-0.5 mx-auto mb-6 bg-gray-200" />

            {/* Verification code */}
            <div className="inline-flex flex-col items-center gap-1">
              <p className="text-[10px] uppercase tracking-widest text-gray-300 font-semibold">
                Código de verificação
              </p>
              <p className="text-base font-mono font-bold tracking-widest text-gray-500">
                {verificationCode}
              </p>
              <p className="text-[10px] text-gray-300">
                Verifique em {verifyUrl}
              </p>
            </div>

            {/* Footer */}
            {settings.footer_text && (
              <p className="text-[11px] text-gray-400 mt-8 max-w-xl mx-auto">
                {settings.footer_text}
              </p>
            )}
          </div>

          {/* Bottom accent bar */}
          <div className="h-1 w-full" style={{ backgroundColor: accentColor + '40' }} />
        </div>

        {/* Verify link — hidden on print / preview */}
        {showActions && (
          <p className="text-center text-xs text-[var(--muted)] mt-4 no-print">
            Link público de verificação:{' '}
            <Link
              href={`/verify/${verificationCode}`}
              className="underline hover:text-[var(--text)]"
            >
              /verify/{verificationCode}
            </Link>
          </p>
        )}
      </div>
    </>
  )
}
