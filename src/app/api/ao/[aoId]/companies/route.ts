import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    // Récupérer les emails des utilisateurs company
    const userIds = companies.map((c) => c.companyUserId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, firstName: true, lastName: true, agency: { select: { name: true } } },
    })

    const usersMap = new Map(users.map((u) => [u.id, u]))

    const result = companies.map((c) => ({
      ...c,
      inviteToken: undefined, // Ne jamais retourner le token
      companyUser: usersMap.get(c.companyUserId) ?? null,
    }))

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('[GET /api/ao/[aoId]/companies]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
