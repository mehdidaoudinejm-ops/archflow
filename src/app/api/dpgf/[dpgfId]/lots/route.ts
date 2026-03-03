import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createLotSchema } from '@/lib/validations/dpgf'

export const dynamic = 'force-dynamic'

async function checkDPGFAccess(dpgfId: string, agencyId: string) {
  const dpgf = await prisma.dPGF.findUnique({
    where: { id: dpgfId },
    include: { project: { select: { agencyId: true } } },
  })
  if (!dpgf || dpgf.project.agencyId !== agencyId) return null
  return dpgf
}

export async function GET(
  _req: Request,
  { params }: { params: { dpgfId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const access = await checkDPGFAccess(params.dpgfId, user.agencyId!)
    if (!access) {
      return NextResponse.json({ error: 'DPGF introuvable' }, { status: 404 })
    }

    const lots = await prisma.lot.findMany({
      where: { dpgfId: params.dpgfId },
      orderBy: { position: 'asc' },
      include: {
        _count: { select: { posts: true } },
      },
    })

    return NextResponse.json(lots, { status: 200 })
  } catch (error) {
    console.error('[GET /api/dpgf/[dpgfId]/lots]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: { dpgfId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const access = await checkDPGFAccess(params.dpgfId, user.agencyId!)
    if (!access) {
      return NextResponse.json({ error: 'DPGF introuvable' }, { status: 404 })
    }

    const body: unknown = await req.json()
    const parsed = createLotSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    // Calculer le prochain numéro et la prochaine position
    const existingLots = await prisma.lot.findMany({
      where: { dpgfId: params.dpgfId },
      select: { number: true, position: true },
      orderBy: { position: 'desc' },
    })

    const nextNumber = parsed.data.number ?? (existingLots.length > 0
      ? Math.max(...existingLots.map((l) => l.number)) + 1
      : 1)
    const nextPosition = existingLots.length > 0
      ? Math.max(...existingLots.map((l) => l.position)) + 1
      : 0

    const lot = await prisma.lot.create({
      data: {
        dpgfId: params.dpgfId,
        name: parsed.data.name,
        number: nextNumber,
        position: nextPosition,
      },
    })

    return NextResponse.json(lot, { status: 201 })
  } catch (error) {
    console.error('[POST /api/dpgf/[dpgfId]/lots]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
