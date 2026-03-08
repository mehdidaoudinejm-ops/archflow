export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const now = new Date()

    const announcement = await prisma.announcement.findFirst({
      where: {
        isActive: true,
        OR: [
          // Pas de dates → toujours visible
          { startDate: null, endDate: null },
          // startDate seule
          { startDate: { lte: now }, endDate: null },
          // endDate seule
          { startDate: null, endDate: { gte: now } },
          // Les deux
          { startDate: { lte: now }, endDate: { gte: now } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(announcement ?? null)
  } catch (error) {
    console.error('[GET /api/announcements/active]', error)
    return NextResponse.json(null)
  }
}
