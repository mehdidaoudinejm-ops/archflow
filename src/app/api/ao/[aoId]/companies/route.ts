import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildPortalUrl } from '@/lib/invite'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: { aoId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    // Vérifier que l'AO appartient à l'agence
    const ao = await prisma.aO.findUnique({
      where: { id: params.aoId },
      include: { dpgf: { include: { project: { select: { agencyId: true } } } } },
    })

    if (!ao || ao.dpgf.project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'AO introuvable' }, { status: 404 })
    }

    const companies = await prisma.aOCompany.findMany({
      where: { aoId: params.aoId },
      include: {
        offer: { select: { id: true, submittedAt: true, isComplete: true } },
      },
      orderBy: { id: 'asc' },
    })

    // Récupérer les infos utilisateurs company
    const userIds = companies.map((c) => c.companyUserId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        agency: { select: { name: true, siretVerified: true, dirigeantNom: true, dirigeantPrenoms: true } },
      },
    })

    const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

    const usersMap = new Map(users.map((u) => [u.id, u]))

    const result = companies.map((c) => {
      const u = usersMap.get(c.companyUserId) ?? null
      const agency = u?.agency as ({ name: string | null; siretVerified?: boolean; dirigeantNom?: string | null; dirigeantPrenoms?: string | null } | null | undefined)
      let dirigeantNameMatch: boolean | null = null
      if (agency?.siretVerified && agency.dirigeantNom) {
        const sigLast = normalize(u?.lastName ?? '')
        const sigFirst = normalize(u?.firstName ?? '')
        const govLast = normalize(agency.dirigeantNom)
        const govFirst = normalize(agency.dirigeantPrenoms ?? '')
        if (govLast && sigLast) {
          const lastMatch = govLast === sigLast
          const firstMatch = !govFirst || !sigFirst || govFirst.includes(sigFirst) || sigFirst.includes(govFirst)
          dirigeantNameMatch = lastMatch && firstMatch
        }
      }
      return {
        ...c,
        inviteToken: undefined,
        portalUrl: c.inviteToken ? buildPortalUrl(params.aoId, c.inviteToken) : null,
        companyUser: u,
        dirigeantNameMatch,
      }
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('[GET /api/ao/[aoId]/companies]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
