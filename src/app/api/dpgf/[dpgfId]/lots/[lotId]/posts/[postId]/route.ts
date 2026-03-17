import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updatePostSchema } from '@/lib/validations/dpgf'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  { params }: { params: { dpgfId: string; lotId: string; postId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const body: unknown = await req.json()
    const parsed = updatePostSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    // Ownership check + update in a single query — no separate checkPostAccess round-trip
    const { count } = await prisma.post.updateMany({
      where: {
        id: params.postId,
        lotId: params.lotId,
        lot: {
          dpgfId: params.dpgfId,
          dpgf: { project: { agencyId: user.agencyId! } },
        },
      },
      data: parsed.data,
    })

    if (count === 0) {
      return NextResponse.json({ error: 'Poste introuvable' }, { status: 404 })
    }

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('[PATCH /api/dpgf/[dpgfId]/lots/[lotId]/posts/[postId]]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { dpgfId: string; lotId: string; postId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    // Verify ownership with a single lightweight query
    const post = await prisma.post.findFirst({
      where: {
        id: params.postId,
        lotId: params.lotId,
        lot: {
          dpgfId: params.dpgfId,
          dpgf: { project: { agencyId: user.agencyId! } },
        },
      },
      select: { id: true },
    })
    if (!post) {
      return NextResponse.json({ error: 'Poste introuvable' }, { status: 404 })
    }

    // Block deletion if offers exist
    const offersCount = await prisma.offerPost.count({
      where: { postId: params.postId },
    })
    if (offersCount > 0) {
      return NextResponse.json(
        { error: 'Impossible de supprimer ce poste : des offres existent' },
        { status: 409 }
      )
    }

    await prisma.post.delete({ where: { id: params.postId } })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('[DELETE /api/dpgf/[dpgfId]/lots/[lotId]/posts/[postId]]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
