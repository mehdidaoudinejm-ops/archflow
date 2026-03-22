import { NextResponse } from 'next/server'
import { requireRole, AuthError } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') ?? ''
    const lot    = searchParams.get('lot')    ?? ''

    const items = await prisma.libraryItem.findMany({
      where: {
        validated: true,
        ...(lot    ? { lot: { equals: lot, mode: 'insensitive' } } : {}),
        ...(search ? { intitule: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ usageCount: 'desc' }, { createdAt: 'desc' }],
      take: 200,
      select: { id: true, intitule: true, unite: true, lot: true, sousLot: true, usageCount: true },
    })

    return NextResponse.json(items)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[GET /api/library/items]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
