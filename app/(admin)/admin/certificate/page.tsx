import { Award } from 'lucide-react'
import { getCertificateSettings } from './actions'
import { CertificateSettingsForm } from './certificate-settings-form'

export default async function CertificateAdminPage() {
  const settings = await getCertificateSettings()

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      <div className="mb-8 flex items-center gap-3">
        <Award size={22} className="text-[var(--green)]" />
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Certificado</h1>
          <p className="text-sm text-[var(--muted)]">
            Personalize a marca, os textos e a assinatura dos certificados da plataforma
          </p>
        </div>
      </div>

      <CertificateSettingsForm initial={settings} />
    </div>
  )
}
