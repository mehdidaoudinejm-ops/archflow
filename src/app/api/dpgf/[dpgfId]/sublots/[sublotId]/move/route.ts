import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  { params }: { params: { dpgfId: string; sublotId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const body = await req.json() as { targetLotId: string }
    const { targetLotId } = body

    if (!targetLotId) {
      return NextResponse.json({ error: 'targetLotId requis' }, { status: 422 })
    }

    // Check sublot ownership
    const sublot = await prisma.subLot.findUnique({
      where: { id: params.sublotId },
      include: { lot: { include: { dpgf: { include: { project: true } } } } },
    })
    if (
      !sublot ||
      sublot.lot.dpgfId !== params.dpgfId ||
      sublot.lot.dpgf.project.agencyId !== user.agencyId
    ) {
      return NextResponse.json({ error: 'Sous-lot introuvable' }, { status: 404 })
    }

    // Already in target lot
    if (sublot.lotId === targetLotId) {
      return NextResponse.json(sublot)
    }

    // Check target lot belongs to same DPGF
    const targetLot = await prisma.lot.findUnique({ where: { id: targetLotId } })
    if (!targetLot || targetLot.dpgfId !== params.dpgfId) {
      return NextResponse.json({ error: 'Lot cible invalide' }, { status: 422 })
    }

    // Compute new position
    const lastSublot = await prisma.subLot.findFirst({
      where: { lotId: targetLotId },
      orderBy: { position: 'desc' },
      select: { position: true },
    })
    const newPosition = lastSublot ? lastSublot.position + 1 : 1

    const updated = await prisma.subLot.update({
      where: { id: params.sublotId },
      data: { lotId: targetLotId, position: newPosition },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/dpgf/[dpgfId]/sublots/[sublotId]/move]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
