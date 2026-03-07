import { createServerClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
import type { Role } from '@prisma/client'

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

export async function getSession() {
  const supabase = await createServerClient()
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error || !session) return null
  return session
}

export async function requireRole(allowedRoles: Role[]) {
  const session = await getSession()

  if (!session) {
    throw new AuthError('Non authentifié', 401)
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: { agency: true },
  })

  if (!user) {
    throw new AuthError('Utilisateur introuvable', 404)
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
