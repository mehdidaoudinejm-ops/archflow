import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { renumberLotSublots } from '@/lib/dpgf-numbering'

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

    const sourceLotId = sublot.lotId
    const sourceLotNumber = sublot.lot.number

    await prisma.$transaction(async (tx) => {
      // Move all posts in this sublot to the target lot
      await tx.post.updateMany({
        where: { sublotId: params.sublotId },
        data: { lotId: targetLotId },
      })

      // Move the sublot itself (position will be fixed by renumberLotSublots)
      await tx.subLot.update({
        where: { id: params.sublotId },
        data: { lotId: targetLotId, position: 9999 },
      })

      // Renumber both lots — this fixes sublot numbers and all post refs
      await renumberLotSublots(tx, sourceLotId, sourceLotNumber)
      await renumberLotSublots(tx, targetLotId, targetLot.number)
    })

    const updated = await prisma.subLot.findUnique({ where: { id: params.sublotId } })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/dpgf/[dpgfId]/sublots/[sublotId]/move]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
