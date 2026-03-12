export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AdminAuthError, requireAdmin } from '@/lib/admin-auth'

export async function GET() {
  try {
    await requireAdmin()

    const [users, importCounts] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          suspended: true,
          freeAccess: true,
          aiImportLimit: true,
          lastSeenAt: true,
          createdAt: true,
          agencyId: true,
          agency: { select: { id: true, name: true, plan: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      prisma.aIImport.groupBy({
        by: ['createdById'],
        _count: { id: true },
      }),
    ])

    const importCountMap = new Map(importCounts.map((r) => [r.createdById, r._count.id]))

    const result = users.map((u) => ({
      ...u,
      aiImportCount: importCountMap.get(u.id) ?? 0,
      aiImportLimit: u.aiImportLimit ?? 5,
    }))

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
