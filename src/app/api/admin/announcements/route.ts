import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  message: z.string().min(1).max(500),
  type: z.enum(['INFO', 'SUCCESS', 'WARNING']).default('INFO'),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  link: z.string().url().optional().nullable().or(z.literal('')),
})

export async function GET() {
  try {
    const session = await requireAdmin()
    if (!session) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(announcements)
  } catch (error) {
    console.error('[GET /api/admin/announcements]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAdmin()
    if (!session) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const body: unknown = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 422 })

    const { message, type, startDate, endDate, isActive, link } = parsed.data

    const announcement = await prisma.announcement.create({
      data: {
        message,
        type,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isActive,
        link: link || null,
      },
    })

    return NextResponse.json(announcement, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/announcements]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
