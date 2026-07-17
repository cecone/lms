import type { CertificateSettings } from '@/types/database'

/**
 * Valores-padrão do certificado — espelham os defaults da migration
 * (013_certificate_settings.sql). Usados como fallback quando a linha de
 * configuração ainda não existe no banco.
 */
export const DEFAULT_CERTIFICATE_SETTINGS: CertificateSettings = {
  id: 1,
  institution_name: 'learn·studio',
  logo_url: null,
  brand_color: '#22c55e',
  title: 'Certificado de Conclusão',
  intro_text: 'Certificamos que',
  middle_text: 'concluiu com êxito o curso',
  footer_text: null,
  signature_name: null,
  signature_role: null,
  signature_image_url: null,
  verify_url_base: 'learnstudio.app/verify',
  updated_at: '1970-01-01T00:00:00.000Z',
}
