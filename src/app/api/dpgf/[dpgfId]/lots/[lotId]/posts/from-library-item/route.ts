import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, AuthError } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const schema = z.object({
  libraryItemId: z.string().min(1),
  sublotId:      z.string().nullable().optional(),
})

function computeRef(lotNumber: number, position: number, sublotNumber?: string): string {
  const ln = lotNumber.toString().padStart(2, '0')
  const pn = (position + 1).toString().padStart(2, '0')
  if (sublotNumber) return `${ln}.${sublotNumber}.${pn}`
  return `${ln}.${pn}`
}

export async function POST(
  req: Request,
  { params }: { params: { dpgfId: string; lotId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const body: unknown = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 422 })
    }

    // Verify lot → dpgf → agency ownership
    const lot = await prisma.lot.findUnique({
      where: { id: params.lotId },
      include: { dpgf: { include: { project: true } } },
    })
    if (!lot || lot.dpgfId !== params.dpgfId || lot.dpgf.project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Fetch global library item (must be validated)
    const libItem = await prisma.libraryItem.findUnique({
      where: { id: parsed.data.libraryItemId },
    })
    if (!libItem || !libItem.validated) {
      return NextResponse.json({ error: 'Intitulé introuvable' }, { status: 404 })
    }

    const sublotId = parsed.data.sublotId ?? null

    const maxPos = await prisma.post.aggregate({
      where: sublotId ? { sublotId } : { lotId: params.lotId, sublotId: null },
      _max: { position: true },
    })
    const position = (maxPos._max.position ?? -1) + 1

    let sublotNumber: string | undefined
    if (sublotId) {
      const sl = await prisma.subLot.findUnique({ where: { id: sublotId } })
      sublotNumber = sl?.number
    }
    const ref = computeRef(lot.number, position, sublotNumber)

    const post = await prisma.post.create({
      data: {
        lotId:    params.lotId,
        sublotId: sublotId ?? null,
        ref,
        title:    libItem.intitule,
        unit:     libItem.unite ?? '',
        position,
      },
    })

    // Incrémenter le compteur d'usage de la bibliothèque globale
    await prisma.libraryItem.update({
      where: { id: libItem.id },
      data:  { usageCount: { increment: 1 } },
    })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[POST from-library-item]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
