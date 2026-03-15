import { NextResponse } from 'next/server'
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const lot = searchParams.get('lot') ?? undefined
    const validated = searchParams.get('validated')
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const sortBy = searchParams.get('sortBy') ?? 'createdAt'
    const sortDir = searchParams.get('sortDir') === 'desc' ? 'desc' : 'asc'
    const limit = 50

    const where: { lot?: string; validated?: boolean } = {}
    if (lot) where.lot = lot
    if (validated === 'true') where.validated = true
    if (validated === 'false') where.validated = false

    const dir = sortDir as 'asc' | 'desc'
    const orderBy = sortBy === 'lot'
      ? [{ lot: dir }, { intitule: 'asc' as const }]
      : [{ validated: 'asc' as const }, { createdAt: dir }]

    const [items, total, lotRows] = await Promise.all([
      prisma.libraryItem.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.libraryItem.count({ where }),
      prisma.libraryItem.findMany({
        select: { lot: true },
        distinct: ['lot'],
        orderBy: { lot: 'asc' },
      }),
    ])

    return NextResponse.json({ items, total, lots: lotRows.map((l) => l.lot), page, limit })
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[GET /api/admin/library]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
