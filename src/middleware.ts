import { createServerClient } from '@supabase/ssr'
import { jwtVerify } from 'jose'
import { NextResponse, type NextRequest } from 'next/server'

async function verifyPortalToken(token: string): Promise<boolean> {
  try {
    const secret = process.env.INVITE_JWT_SECRET
    if (!secret) return false
    await jwtVerify(token, new TextEncoder().encode(secret))
    return true
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Routes publiques — toujours autorisées
  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')

  if (isPublic) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user: session },
  } = await supabase.auth.getUser()

  // Routes portail entreprise — vérification token JWT d'invitation
  if (pathname.startsWith('/portal/')) {
    const token = request.nextUrl.searchParams.get('token')

    if (token) {
      const valid = await verifyPortalToken(token)
      if (valid) return response
    }

    // Fallback : session Supabase valide (entreprise déjà connectée)
    if (session) return response

    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Routes espace client
  if (pathname.startsWith('/client/')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  // Routes admin — bloquées si non connecté (defense-in-depth, requireAdmin() vérifie le rôle)
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!session) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
      }
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Routes shell — redirige vers /login si non connecté
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/dpgf') ||
    pathname.startsWith('/mes-appels-doffres') ||
    pathname.startsWith('/annuaire')
  ) {
    if (!session) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
