import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'

export interface PortalSession {
  aoCompany: {
    id: string
    aoId: string
    companyUserId: string
    status: string
    paymentStatus: string | null
  }
  companyUser: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    agencyId: string | null
    agency: { name: string } | null
  }
}

/**
 * Authentification portail entreprise — token opaque uniquement.
 * Le token est passé dans le header X-Portal-Token (API routes)
 * ou en query param ?token= (pages server components).
 */
export async function requirePortalAuth(req: Request, aoId: string): Promise<PortalSession> {
  const token = req.headers.get('X-Portal-Token')

  if (!token) throw new AuthError('Token requis', 401)

  const aoCompany = await prisma.aOCompany.findFirst({
    where: { inviteToken: token, aoId },
  })

  if (!aoCompany) throw new AuthError('Lien invalide', 401)

  const companyUser = await prisma.user.findUnique({
    where: { id: aoCompany.companyUserId },
    include: { agency: { select: { name: true } } },
  })

  if (!companyUser) throw new AuthError('Utilisateur introuvable', 404)

  // Enregistrer la première utilisation du token (audit)
  if (!aoCompany.tokenUsedAt) {
    await prisma.aOCompany.update({
      where: { id: aoCompany.id },
      data: { tokenUsedAt: new Date() },
    })
  }

  return { aoCompany, companyUser }
}
