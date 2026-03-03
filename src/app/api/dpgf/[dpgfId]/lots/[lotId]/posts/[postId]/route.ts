import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updatePostSchema } from '@/lib/validations/dpgf'

export const dynamic = 'force-dynamic'

async function checkPostAccess(
  dpgfId: string,
  lotId: string,
  postId: string,
  agencyId: string
) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      lot: {
        include: {
          dpgf: { include: { project: { select: { agencyId: true } } } },
        },
      },
    },
  })
  if (
    !post ||
    post.lotId !== lotId ||
    post.lot.dpgfId !== dpgfId ||
    post.lot.dpgf.project.agencyId !== agencyId
  ) {
    return null
  }
  return post
}

export async function PATCH(
  req: Request,
  { params }: { params: { dpgfId: string; lotId: string; postId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const post = await checkPostAccess(
      params.dpgfId,
      params.lotId,
      params.postId,
      user.agencyId!
    )
    if (!post) {
      return NextResponse.json({ error: 'Poste introuvable' }, { status: 404 })
    }

    const body: unknown = await req.json()
    const parsed = updatePostSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const updated = await prisma.post.update({
      where: { id: params.postId },
      data: parsed.data,
    })

    return NextResponse.json(updated, { status: 200 })
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

    const post = await checkPostAccess(
      params.dpgfId,
      params.lotId,
      params.postId,
      user.agencyId!
    )
    if (!post) {
      return NextResponse.json({ error: 'Poste introuvable' }, { status: 404 })
    }

    // Bloquer la suppression si des offres existent
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
