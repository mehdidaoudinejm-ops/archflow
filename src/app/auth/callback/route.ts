import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Gère le callback du magic link Supabase (type PKCE avec ?code=)
// et redirige le client vers son espace projet
export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Pas de code (hash-based flow) ou erreur → page de fallback
  return NextResponse.redirect(`${origin}/auth/callback/client`)
}
