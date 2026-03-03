import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateLotSchema } from '@/lib/validations/dpgf'

export const dynamic = 'force-dynamic'

async function checkLotAccess(dpgfId: string, lotId: string, agencyId: string) {
  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: {
      dpgf: { include: { project: { select: { agencyId: true } } } },
    },
  })
  if (!lot || lot.dpgfId !== dpgfId || lot.dpgf.project.agencyId !== agencyId) return null
  return lot
}

export async function PATCH(
  req: Request,
  { params }: { params: { dpgfId: string; lotId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const lot = await checkLotAccess(params.dpgfId, params.lotId, user.agencyId!)
    if (!lot) {
      return NextResponse.json({ error: 'Lot introuvable' }, { status: 404 })
    }

    const body: unknown = await req.json()
    const parsed = updateLotSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const updated = await prisma.lot.update({
      where: { id: params.lotId },
      data: parsed.data,
    })

    return NextResponse.json(updated, { status: 200 })
  } catch (error) {
    console.error('[PATCH /api/dpgf/[dpgfId]/lots/[lotId]]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { dpgfId: string; lotId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const lot = await checkLotAccess(params.dpgfId, params.lotId, user.agencyId!)
    if (!lot) {
      return NextResponse.json({ error: 'Lot introuvable' }, { status: 404 })
    }

    // Vérifier si des offres existent sur les postes de ce lot
    const offersCount = await prisma.offerPost.count({
      where: { post: { lotId: params.lotId } },
    })

    if (offersCount > 0) {
      return NextResponse.json(
        { error: 'Impossible de supprimer ce lot : des offres existent sur ses postes' },
        { status: 409 }
      )
    }

    // Supprimer les posts, sublots puis le lot
    await prisma.$transaction([
      prisma.post.deleteMany({ where: { lotId: params.lotId } }),
      prisma.subLot.deleteMany({ where: { lotId: params.lotId } }),
      prisma.lot.delete({ where: { id: params.lotId } }),
    ])

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('[DELETE /api/dpgf/[dpgfId]/lots/[lotId]]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
