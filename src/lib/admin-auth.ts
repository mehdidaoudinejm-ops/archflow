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
 */
/**
 * Crée un profil Prisma minimal pour tout utilisateur Supabase sans profil existant.
 * Appelé depuis le layout shell quand session Supabase existe mais User Prisma absent.
 */
export async function bootstrapRegularUser(
  email: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return

  const meta = (metadata ?? {}) as Record<string, string>
  const localPart = email.split('@')[0] ?? ''
  const baseName = localPart.split('.')[0] ?? ''
  const firstName = meta.firstName ?? meta.first_name ??
    (baseName ? baseName.charAt(0).toUpperCase() + baseName.slice(1) : 'Architecte')
  const lastName = meta.lastName ?? meta.last_name ?? ''
  const agencyName = meta.agencyName ?? `Cabinet ${firstName}`

  const agency = await prisma.agency.create({
    data: { name: agencyName, plan: 'SOLO', activeModules: ['dpgf'] },
  })

  await prisma.user.create({
    data: { agencyId: agency.id, email, role: 'ARCHITECT', firstName, lastName },
  })
}

export async function bootstrapAdminUser(email: string): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return

  // Créer une agence admin minimale
  const agency = await prisma.agency.create({
    data: {
      name: 'ArchFlow Admin',
      plan: 'AGENCY',
      activeModules: ['dpgf'],
    },
  })

  // Extraire le prénom depuis la partie locale de l'email
  const localPart = email.split('@')[0] ?? ''
  const firstName = localPart.split('.')[0]
    ? localPart.split('.')[0]!.charAt(0).toUpperCase() + localPart.split('.')[0]!.slice(1)
    : 'Admin'

  await prisma.user.create({
    data: {
      agencyId: agency.id,
      email,
      role: 'ARCHITECT',
      firstName,
    },
  })
}
