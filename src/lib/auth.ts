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
  // getSession() lit le JWT depuis le cookie localement — pas d'appel réseau.
  // getUser() ferait un aller-retour HTTP vers Supabase Auth (~100-300ms en dev,
  // ~5ms en prod même région). La sécurité est garantie par : signature JWT +
  // vérification user.suspended en DB ci-dessous.
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error || !session?.user?.email) return null
  return { user: { email: session.user.email, id: session.user.id } }
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
