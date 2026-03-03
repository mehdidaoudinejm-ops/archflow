import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const now = new Date()

    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        OR: [
          { startDate: null },
          { startDate: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    })

    return NextResponse.json(announcements)
  } catch (error) {
    console.error('[GET /api/announcements/active]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
