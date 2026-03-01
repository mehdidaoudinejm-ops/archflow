import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createLibrarySchema } from '@/lib/validations/library'

export async function GET(req: Request) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') ?? ''
    const trade  = searchParams.get('trade')  ?? ''

    const items = await prisma.library.findMany({
      where: {
        agencyId: user.agencyId!,
        ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
        ...(trade  ? { trade } : {}),
      },
      orderBy: [{ usageCount: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('[GET /api/library]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const body: unknown = await req.json()
    const parsed = createLibrarySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 422 })
    }

    const item = await prisma.library.create({
      data: {
        agencyId: user.agencyId!,
        title:    parsed.data.title,
        unit:     parsed.data.unit,
        avgPrice: parsed.data.avgPrice ?? null,
        trade:    parsed.data.trade    ?? null,
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('[POST /api/library]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
