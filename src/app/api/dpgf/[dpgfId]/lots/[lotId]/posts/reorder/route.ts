import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { reorderPostsSchema } from '@/lib/validations/dpgf'
import { computeRef } from '@/lib/dpgf-numbering'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  { params }: { params: { dpgfId: string; lotId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const body: unknown = await req.json()
    const parsed = reorderPostsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    // Verify ownership
    const lot = await prisma.lot.findFirst({
      where: {
        id: params.lotId,
        dpgfId: params.dpgfId,
        dpgf: { project: { agencyId: user.agencyId! } },
      },
      select: {
        number: true,
        sublots: parsed.data.sublotId
          ? { where: { id: parsed.data.sublotId }, select: { number: true } }
          : false,
      },
    })
    if (!lot) {
      return NextResponse.json({ error: 'Lot introuvable' }, { status: 404 })
    }

    const sublotNumber = parsed.data.sublotId
      ? (lot.sublots as { number: string }[])[0]?.number
      : undefined

    await prisma.$transaction(
      parsed.data.items.map(({ postId, position }) =>
        prisma.post.update({
          where: { id: postId, lotId: params.lotId },
          data: {
            position,
            ref: computeRef(lot.number, position, sublotNumber),
          },
        })
      )
    )

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('[PATCH /api/dpgf/[dpgfId]/lots/[lotId]/posts/reorder]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
