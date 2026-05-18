import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Role } from '@/types/database'

const AUTH_ROUTES = ['/login', '/register']   // redireciona se já logado
const OPEN_ROUTES = ['/verify']               // sempre acessível, sem redirecionamento
const CREATOR_ROUTES = ['/studio']
const ADMIN_ROUTES = ['/admin']
const COORD_ROUTES = ['/reports']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Rotas sempre acessíveis (verificação de certificado etc.)
  if (OPEN_ROUTES.some((r) => path.startsWith(r))) {
    return supabaseResponse
  }

  // Rotas de auth — redireciona para home se já logado
  if (AUTH_ROUTES.some((r) => path.startsWith(r))) {
    if (user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return supabaseResponse
  }

  // Sem sessão → login
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', path)
    return NextResponse.redirect(loginUrl)
  }

  // Busca papel do usuário
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role: Role = profile?.role ?? 'aluno'

  // Proteção de rotas por papel
  if (ADMIN_ROUTES.some((r) => path.startsWith(r)) && role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (
    COORD_ROUTES.some((r) => path.startsWith(r)) &&
    !['coordenador', 'admin'].includes(role)
  ) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (
    CREATOR_ROUTES.some((r) => path.startsWith(r)) &&
    !['professor', 'coordenador', 'admin'].includes(role)
  ) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
