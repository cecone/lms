import { createClient } from '@/lib/supabase/server'
import { Users } from 'lucide-react'
import { UsersManager } from './users-manager'

export const dynamic = 'force-dynamic'

export default async function UsersAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const serviceKeyConfigured = !!process.env.SUPABASE_SERVICE_ROLE_KEY

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      <div className="mb-8 flex items-center gap-3">
        <Users size={24} className="text-[var(--blue)]" />
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Usuários</h1>
          <p className="text-sm text-[var(--muted)]">Pesquise, crie, edite e desative contas</p>
        </div>
      </div>

      {!serviceKeyConfigured && (
        <div className="mb-6 rounded-xl border border-[var(--amber)]/30 bg-[var(--amber)]/10 px-4 py-3 text-sm text-[var(--amber)]">
          <strong>SUPABASE_SERVICE_ROLE_KEY</strong> não está configurada. Adicione-a ao
          {' '}<code>.env.local</code> (e nas variáveis de ambiente da Vercel) para conseguir
          criar, editar e desativar usuários.
        </div>
      )}

      <UsersManager currentUserId={user?.id ?? ''} />
    </div>
  )
}
