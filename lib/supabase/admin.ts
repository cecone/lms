import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase com a *service role key*. Ignora RLS e dá acesso à API
 * admin (auth.admin.*). Use APENAS em código server-side (server actions,
 * route handlers). Nunca importe em componentes client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY não configurada. Adicione-a ao .env.local ' +
      '(e nas variáveis de ambiente da Vercel) para gerenciar usuários.'
    )
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
