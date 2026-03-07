export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AdminAuthError, requireAdmin } from '@/lib/admin-auth'
import { z } from 'zod'

const createSchema = z.object({
  message: z.string().min(1),
  type: z.enum(['INFO', 'SUCCESS', 'WARNING']).default('INFO'),
  link: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
})

export async function GET() {
  try {
    await requireAdmin()

    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(announcements)
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin()

    const body = await req.json()
    const data = createSchema.parse(body)

    const announcement = await prisma.announcement.create({
      data: {
        message: data.message,
        type: data.type,
        link: data.link ?? null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    })

    return NextResponse.json(announcement, { status: 201 })
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
