import { createServerClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
import type { Role } from '@prisma/client'
import { jwtVerify } from 'jose'

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Fast path: verify the Supabase JWT locally (no HTTP call, ~1ms).
 * Falls back to supabase.auth.getUser() when the token is expired or missing,
 * which makes the network call and handles token refresh.
 */
export async function getSession() {
  const supabase = await createServerClient()

  // Try to read the session from the cookie — no network
  const { data: { session } } = await supabase.auth.getSession()

  if (session?.access_token && process.env.SUPABASE_JWT_SECRET) {
    try {
      const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET)
      const { payload } = await jwtVerify(session.access_token, secret)
      const email = payload.email as string | undefined
      const id = payload.sub
      if (email && id) return { user: { email, id } }
    } catch {
      // Expired or tampered — fall through to the authoritative check
    }
  }

  // Slow path: validates with Supabase server and refreshes if needed
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user || !user.email) return null
  return { user: { email: user.email, id: user.id } }
}

export async function requireRole(allowedRoles: Role[]) {
  const session = await getSession()

  if (!session) {
    throw new AuthError('Non authentifié', 401)
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      role: true,
      agencyId: true,
      suspended: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      aiImportLimit: true,
      // agency sélectionné avec les seuls champs utilisés dans l'app
      agency: { select: { id: true, name: true, plan: true, activeModules: true } },
    },
  })

  if (!user) {
    throw new AuthError('Utilisateur introuvable', 404)
  }

  if (user.suspended) {
    throw new AuthError('Compte suspendu', 403)
  }

  if (!allowedRoles.includes(user.role)) {
    throw new AuthError('Accès refusé', 403)
  }

  return user
}

export async function getUserWithProfile() {
  const session = await getSession()

  if (!session) return null

  const user = await prisma.user.upsert({
    where: { email: session.user.email! },
    update: {},
    create: {
      id: session.user.id,
      email: session.user.email!,
      role: 'ARCHITECT',
    },
    include: { agency: true },
  })

  return user
}
