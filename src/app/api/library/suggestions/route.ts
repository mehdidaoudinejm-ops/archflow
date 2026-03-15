import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const lot = searchParams.get('lot') ?? ''
    const q = searchParams.get('q') ?? ''

    if (q.length < 2) return NextResponse.json([])

    const items = await prisma.libraryItem.findMany({
      where: {
        validated: true,
        lot: { equals: lot, mode: 'insensitive' },
        intitule: { contains: q, mode: 'insensitive' },
      },
      orderBy: { usageCount: 'desc' },
      take: 20,
      select: { id: true, intitule: true, unite: true, usageCount: true },
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('[GET /api/library/suggestions]', error)
    return NextResponse.json([])
  }
}
