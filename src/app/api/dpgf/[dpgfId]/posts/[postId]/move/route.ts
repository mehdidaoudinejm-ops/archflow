import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function computeRef(lotNumber: number, position: number, sublotNumber?: string): string {
  const ln = lotNumber.toString().padStart(2, '0')
  const pn = position.toString().padStart(2, '0')
  if (sublotNumber) return `${ln}.${sublotNumber}.${pn}`
  return `${ln}.${pn}`
}

export async function PATCH(
  req: Request,
  { params }: { params: { dpgfId: string; postId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const body = await req.json() as { targetLotId: string; targetSublotId: string | null }
    const { targetLotId, targetSublotId } = body

    if (!targetLotId) {
      return NextResponse.json({ error: 'targetLotId requis' }, { status: 422 })
    }

    // Check post ownership
    const post = await prisma.post.findUnique({
      where: { id: params.postId },
      include: { lot: { include: { dpgf: { include: { project: true } } } } },
    })
    if (
      !post ||
      post.lot.dpgfId !== params.dpgfId ||
      post.lot.dpgf.project.agencyId !== user.agencyId
    ) {
      return NextResponse.json({ error: 'Poste introuvable' }, { status: 404 })
    }

    // Check target lot belongs to same DPGF
    const targetLot = await prisma.lot.findUnique({ where: { id: targetLotId } })
    if (!targetLot || targetLot.dpgfId !== params.dpgfId) {
      return NextResponse.json({ error: 'Lot cible invalide' }, { status: 422 })
    }

    // Check target sublot if provided
    let sublotNumber: string | undefined
    if (targetSublotId) {
      const targetSublot = await prisma.subLot.findUnique({ where: { id: targetSublotId } })
      if (!targetSublot || targetSublot.lotId !== targetLotId) {
        return NextResponse.json({ error: 'Sous-lot cible invalide' }, { status: 422 })
      }
      sublotNumber = targetSublot.number
    }

    // Compute new position (last in target container)
    const lastPost = await prisma.post.findFirst({
      where: { lotId: targetLotId, sublotId: targetSublotId ?? null },
      orderBy: { position: 'desc' },
      select: { position: true },
    })
    const newPosition = lastPost ? lastPost.position + 1 : 1
    const newRef = computeRef(targetLot.number, newPosition, sublotNumber)

    const updated = await prisma.post.update({
      where: { id: params.postId },
      data: {
        lotId: targetLotId,
        sublotId: targetSublotId ?? null,
        position: newPosition,
        ref: newRef,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/dpgf/[dpgfId]/posts/[postId]/move]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
