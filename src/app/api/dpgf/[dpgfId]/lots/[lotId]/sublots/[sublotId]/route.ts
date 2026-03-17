import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateSubLotSchema } from '@/lib/validations/dpgf'

export const dynamic = 'force-dynamic'

async function getSublotWithOwnership(
  sublotId: string,
  dpgfId: string,
  agencyId: string
) {
  const sublot = await prisma.subLot.findUnique({
    where: { id: sublotId },
    include: { lot: { include: { dpgf: { include: { project: true } } } } },
  })
  if (
    !sublot ||
    sublot.lot.dpgfId !== dpgfId ||
    sublot.lot.dpgf.project.agencyId !== agencyId
  ) {
    return null
  }
  return sublot
}

export async function PATCH(
  req: Request,
  { params }: { params: { dpgfId: string; lotId: string; sublotId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const body: unknown = await req.json()
    const parsed = updateSubLotSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 422 })
    }

    const sublot = await getSublotWithOwnership(params.sublotId, params.dpgfId, user.agencyId!)
    if (!sublot) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Uniqueness check when number is being changed
    if (parsed.data.number && parsed.data.number !== sublot.number) {
      const conflict = await prisma.subLot.findFirst({
        where: { lotId: sublot.lotId, number: parsed.data.number, id: { not: params.sublotId } },
        select: { id: true },
      })
      if (conflict) {
        return NextResponse.json(
          { error: `Un sous-lot avec le numéro ${parsed.data.number} existe déjà dans ce lot` },
          { status: 409 }
        )
      }
    }

    const updated = await prisma.subLot.update({
      where: { id: params.sublotId },
      data: parsed.data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/dpgf/.../sublots/...]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { dpgfId: string; lotId: string; sublotId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const sublot = await getSublotWithOwnership(params.sublotId, params.dpgfId, user.agencyId!)
    if (!sublot) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Block deletion if offers exist
    const offerCount = await prisma.offerPost.count({
      where: { post: { sublotId: params.sublotId } },
    })
    if (offerCount > 0) {
      return NextResponse.json(
        { error: 'Ce sous-lot a des offres associées et ne peut pas être supprimé' },
        { status: 409 }
      )
    }

    await prisma.$transaction([
      prisma.post.deleteMany({ where: { sublotId: params.sublotId } }),
      prisma.subLot.delete({ where: { id: params.sublotId } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/dpgf/.../sublots/...]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
