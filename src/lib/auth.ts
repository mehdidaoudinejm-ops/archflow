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
  // getUser() vérifie le JWT côté serveur (contrairement à getSession qui lit le cookie sans vérification)
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
    where: { email: session.user.email! },
    include: { agency: true },
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
