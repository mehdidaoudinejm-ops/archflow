import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const session = await requireAdmin()
    if (!session) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('q') ?? ''

    const users = await prisma.user.findMany({
      where: {
        role: 'ARCHITECT',
        ...(search
          ? {
              OR: [
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        agency: { select: { name: true, plan: true } },
        _count: {
          select: {
            activityLogs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Compter projets et AOs par agence
    const agencyIds = users.map(u => u.agencyId).filter(Boolean) as string[]
    const projectCounts = await prisma.project.groupBy({
      by: ['agencyId'],
      where: { agencyId: { in: agencyIds } },
      _count: { id: true },
    })
    const aoCounts = await prisma.aO.findMany({
      where: {
        dpgf: { project: { agencyId: { in: agencyIds } } },
      },
      select: { dpgf: { select: { project: { select: { agencyId: true } } } } },
    })

    const projectCountMap = Object.fromEntries(
      projectCounts.map(p => [p.agencyId, p._count.id])
    )
    const aoCountMap: Record<string, number> = {}
    for (const ao of aoCounts) {
      const agencyId = ao.dpgf.project.agencyId
      aoCountMap[agencyId] = (aoCountMap[agencyId] ?? 0) + 1
    }

    const result = users.map(u => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      createdAt: u.createdAt,
      lastSeenAt: u.lastSeenAt,
      suspended: u.suspended,
      freeAccess: u.freeAccess,
      agency: u.agency,
      projectCount: u.agencyId ? (projectCountMap[u.agencyId] ?? 0) : 0,
      aoCount: u.agencyId ? (aoCountMap[u.agencyId] ?? 0) : 0,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('[GET /api/admin/users]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
