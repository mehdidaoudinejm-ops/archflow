import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { renumberContainerPosts } from '@/lib/dpgf-numbering'

export const dynamic = 'force-dynamic'

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

    // Check post ownership — also fetch sublot.number for renumbering source container
    const post = await prisma.post.findUnique({
      where: { id: params.postId },
      include: {
        lot: { include: { dpgf: { include: { project: true } } } },
        sublot: { select: { number: true } },
      },
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

    // Remember source container for renumbering after move
    const sourceLotId = post.lotId
    const sourceSublotId = post.sublotId
    const sourceLotNumber = post.lot.number
    const sourceSublotNumber = post.sublot?.number

    let updated
    await prisma.$transaction(async (tx) => {
      // Compute new position (last in target container, excluding the post itself)
      const lastPost = await tx.post.findFirst({
        where: {
          lotId: targetLotId,
          sublotId: targetSublotId ?? null,
          id: { not: params.postId },
        },
        orderBy: { position: 'desc' },
        select: { position: true },
      })
      const newPosition = lastPost ? lastPost.position + 1 : 1

      updated = await tx.post.update({
        where: { id: params.postId },
        data: {
          lotId: targetLotId,
          sublotId: targetSublotId ?? null,
          position: newPosition,
          ref: '',
        },
      })

      // Renumber source container (fills the gap left by the moved post)
      await renumberContainerPosts(tx, sourceLotId, sourceSublotId, sourceLotNumber, sourceSublotNumber)

      // Renumber target container (assigns correct sequential position/ref to the new post)
      const isSameContainer = sourceLotId === targetLotId && sourceSublotId === (targetSublotId ?? null)
      if (!isSameContainer) {
        await renumberContainerPosts(tx, targetLotId, targetSublotId ?? null, targetLot.number, sublotNumber)
      }
    })

    // Fetch the final state of the moved post
    const final = await prisma.post.findUnique({ where: { id: params.postId } })
    return NextResponse.json(final)
  } catch (error) {
    console.error('[PATCH /api/dpgf/[dpgfId]/posts/[postId]/move]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
