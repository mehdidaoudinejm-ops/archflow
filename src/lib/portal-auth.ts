import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { verifyInviteToken } from '@/lib/invite'
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

export async function requirePortalAuth(req: Request, aoId: string): Promise<PortalSession> {
  const tokenHeader = req.headers.get('X-Portal-Token')

  if (tokenHeader) {
    try {
      const payload = await verifyInviteToken(tokenHeader)

      if (payload.aoId !== aoId) {
        throw new AuthError('Token invalide pour cet AO', 401)
      }

      const aoCompany = await prisma.aOCompany.findFirst({
        where: { id: payload.aoCompanyId, aoId },
      })

      if (!aoCompany) throw new AuthError('Invitation introuvable', 404)

      const companyUser = await prisma.user.findUnique({
        where: { id: aoCompany.companyUserId },
        include: { agency: { select: { name: true } } },
      })

      if (!companyUser) throw new AuthError('Utilisateur introuvable', 404)

      return { aoCompany, companyUser }
    } catch (err) {
      if (err instanceof AuthError) throw err
      throw new AuthError('Token invalide ou expiré', 401)
    }
  }

  // Fallback : session Supabase (entreprise déjà connectée)
  const session = await getSession()
  if (!session) throw new AuthError('Non authentifié', 401)

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: { agency: { select: { name: true } } },
  })

  if (!user || user.role !== 'COMPANY') {
    throw new AuthError('Accès refusé', 403)
  }

  const aoCompany = await prisma.aOCompany.findFirst({
    where: { companyUserId: user.id, aoId },
  })

  if (!aoCompany) throw new AuthError('Non invité à cet AO', 403)

  return { aoCompany, companyUser: user }
}
