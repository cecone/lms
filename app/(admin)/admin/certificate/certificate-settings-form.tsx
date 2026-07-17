'use client'

import { useState, useTransition } from 'react'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CertificateSettings } from '@/types/database'
import { CertificateView } from '@/app/(dashboard)/courses/[id]/certificate/certificate-view'
import { updateCertificateSettings } from './actions'

const inputClass =
  'w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--green)]'

// Data fixa no preview para evitar divergência de hidratação.
const PREVIEW_ISSUED_AT = '2026-01-15T12:00:00.000Z'

export function CertificateSettingsForm({ initial }: { initial: CertificateSettings }) {
  const [form, setForm] = useState<CertificateSettings>(initial)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, start] = useTransition()

  function set<K extends keyof CertificateSettings>(key: K, value: CertificateSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  function save() {
    setError(null)
    start(async () => {
      const res = await updateCertificateSettings({
        institution_name: form.institution_name,
        logo_url: form.logo_url,
        brand_color: form.brand_color,
        title: form.title,
        intro_text: form.intro_text,
        middle_text: form.middle_text,
        footer_text: form.footer_text,
        signature_name: form.signature_name,
        signature_role: form.signature_role,
        signature_image_url: form.signature_image_url,
        verify_url_base: form.verify_url_base,
      })
      if (!res.ok) setError(res.error)
      else { setSaved(true); setTimeout(() => setSaved(false), 2500) }
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Formulário */}
      <div className="space-y-6">
        <Section title="Marca">
          <Text label="Nome da instituição" value={form.institution_name}
            onChange={(v) => set('institution_name', v)} placeholder="learn·studio" />
          <Text label="URL do logo (opcional)" value={form.logo_url ?? ''}
            onChange={(v) => set('logo_url', v)} placeholder="https://…/logo.png" />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--muted)]">Cor da marca</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.brand_color}
                onChange={(e) => set('brand_color', e.target.value)}
                className="h-9 w-12 rounded-lg border border-[var(--border)] bg-transparent cursor-pointer" />
              <input className={inputClass} value={form.brand_color}
                onChange={(e) => set('brand_color', e.target.value)} placeholder="#22c55e" />
            </div>
            <p className="text-[11px] text-[var(--muted)]">
              Usada como cor padrão. Cursos com cor própria mantêm a sua.
            </p>
          </div>
        </Section>

        <Section title="Textos">
          <Text label="Título" value={form.title}
            onChange={(v) => set('title', v)} placeholder="Certificado de Conclusão" />
          <Text label="Frase de abertura" value={form.intro_text}
            onChange={(v) => set('intro_text', v)} placeholder="Certificamos que" />
          <Text label="Frase intermediária" value={form.middle_text}
            onChange={(v) => set('middle_text', v)} placeholder="concluiu com êxito o curso" />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--muted)]">Rodapé (opcional)</label>
            <textarea className={`${inputClass} min-h-[70px] resize-y`} value={form.footer_text ?? ''}
              onChange={(e) => set('footer_text', e.target.value)}
              placeholder="Texto legal, carga horária, observações…" />
          </div>
        </Section>

        <Section title="Assinatura">
          <Text label="Nome do assinante (opcional)" value={form.signature_name ?? ''}
            onChange={(v) => set('signature_name', v)} placeholder="Ana Coordenadora" />
          <Text label="Cargo (opcional)" value={form.signature_role ?? ''}
            onChange={(v) => set('signature_role', v)} placeholder="Coordenação Pedagógica" />
          <Text label="URL da imagem da assinatura (opcional)" value={form.signature_image_url ?? ''}
            onChange={(v) => set('signature_image_url', v)} placeholder="https://…/assinatura.png" />
        </Section>

        <Section title="Verificação">
          <Text label="Base da URL de verificação" value={form.verify_url_base}
            onChange={(v) => set('verify_url_base', v)} placeholder="learnstudio.app/verify" />
          <p className="text-[11px] text-[var(--muted)]">
            Aparece impresso no certificado como <code>{form.verify_url_base.replace(/\/$/, '')}/CÓDIGO</code>.
          </p>
        </Section>

        {error && <p className="text-sm text-[var(--red)]">{error}</p>}

        <div className="flex items-center gap-3">
          <Button onClick={save} loading={pending} disabled={pending}>
            <Save size={15} /> Salvar configurações
          </Button>
          {saved && <span className="text-sm text-[var(--green)]">Salvo!</span>}
        </div>
      </div>

      {/* Preview ao vivo */}
      <div className="lg:sticky lg:top-6 self-start">
        <p className="text-xs text-[var(--muted)] mb-3 uppercase tracking-wider font-semibold">Pré-visualização</p>
        <div className="scale-[0.85] origin-top -mt-2">
          <CertificateView
            studentName="Maria Silva"
            courseTitle="Introdução ao Design"
            accentColor={form.brand_color}
            issuedAt={PREVIEW_ISSUED_AT}
            verificationCode="ABCD1234"
            courseId=""
            settings={form}
            showActions={false}
          />
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-3">
      <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
      {children}
    </div>
  )
}

function Text({
  label, value, onChange, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-[var(--muted)]">{label}</label>
      <input className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}
