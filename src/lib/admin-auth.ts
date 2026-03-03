import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export function isAdminEmail(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean)
  return adminEmails.includes(email)
}

export async function requireAdmin() {
  const session = await getSession()
  if (!session || !isAdminEmail(session.user.email!)) {
    return null
  }
  return session
}

/**
 * Crée le profil Prisma de l'admin s'il n'existe pas encore.
 * Appelé automatiquement depuis le layout /admin au premier accès.
 * Crée aussi une agence dédiée (l'admin a besoin d'un agencyId valide).
 */
export async function bootstrapAdminUser(email: string): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return

  const agency = await prisma.agency.create({
    data: {
      name: 'ArchFlow Admin',
      plan: 'AGENCY',
      activeModules: ['dpgf'],
    },
  })

  const localPart = email.split('@')[0] ?? ''
  const firstName = localPart.split('.')[0]
    ? localPart.split('.')[0]!.charAt(0).toUpperCase() + localPart.split('.')[0]!.slice(1)
    : 'Admin'

  await prisma.user.upsert({
    where: { email },
    create: { agencyId: agency.id, email, role: 'ARCHITECT', firstName },
    update: {},
  })
}
