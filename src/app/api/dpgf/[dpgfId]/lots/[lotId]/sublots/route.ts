import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createSubLotSchema } from '@/lib/validations/dpgf'

export const dynamic = 'force-dynamic'

export async function POST(
  req: Request,
  { params }: { params: { dpgfId: string; lotId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const body: unknown = await req.json()
    const parsed = createSubLotSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 422 })
    }

    // Verify ownership chain: lot → dpgf → project → agency
    const lot = await prisma.lot.findUnique({
      where: { id: params.lotId },
      include: { dpgf: { include: { project: true } } },
    })

    if (
      !lot ||
      lot.dpgfId !== params.dpgfId ||
      lot.dpgf.project.agencyId !== user.agencyId
    ) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const maxPos = await prisma.subLot.aggregate({
      where: { lotId: params.lotId },
      _max: { position: true },
    })
    const position = (maxPos._max.position ?? -1) + 1

    const sublot = await prisma.subLot.create({
      data: {
        lotId: params.lotId,
        number: parsed.data.number,
        name: parsed.data.name,
        position,
      },
    })

    return NextResponse.json(sublot, { status: 201 })
  } catch (error) {
    console.error('[POST /api/dpgf/.../lots/.../sublots]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
