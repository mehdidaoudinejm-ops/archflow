import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortalAuth } from '@/lib/portal-auth'
import { AuthError } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  selectedLotIds: z.array(z.string()).min(1, 'Sélectionnez au moins un lot'),
})

// PATCH — Enregistrer la sélection de lots de l'entreprise
export async function PATCH(
  req: Request,
  { params }: { params: { aoId: string } }
) {
  try {
    const { aoCompany } = await requirePortalAuth(req, params.aoId)

    const ao = await prisma.aO.findUnique({
      where: { id: params.aoId },
      select: { lotIds: true, status: true },
    })
    if (!ao || ao.status === 'CLOSED' || ao.status === 'ARCHIVED') {
      return NextResponse.json({ error: 'Cet AO est clôturé' }, { status: 400 })
    }

    const body: unknown = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Sélectionnez au moins un lot' }, { status: 422 })
    }

    // Ne garder que les lots qui appartiennent bien à cet AO
    const validLotIds = parsed.data.selectedLotIds.filter((id) => ao.lotIds.includes(id))
    if (validLotIds.length === 0) {
      return NextResponse.json({ error: 'Sélectionnez au moins un lot valide' }, { status: 422 })
    }

    await prisma.aOCompany.update({
      where: { id: aoCompany.id },
      data: { selectedLotIds: validLotIds },
    })

    return NextResponse.json({ success: true, selectedLotIds: validLotIds })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[PATCH /api/portal/[aoId]/selected-lots]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
