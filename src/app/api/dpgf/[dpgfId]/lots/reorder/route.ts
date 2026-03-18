import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { reorderLotsSchema } from '@/lib/validations/dpgf'
import { renumberLotAllPosts } from '@/lib/dpgf-numbering'

export const dynamic = 'force-dynamic'

async function checkDPGFAccess(dpgfId: string, agencyId: string) {
  const dpgf = await prisma.dPGF.findUnique({
    where: { id: dpgfId },
    include: { project: { select: { agencyId: true } } },
  })
  if (!dpgf || dpgf.project.agencyId !== agencyId) return null
  return dpgf
}

export async function PATCH(
  req: Request,
  { params }: { params: { dpgfId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const access = await checkDPGFAccess(params.dpgfId, user.agencyId!)
    if (!access) {
      return NextResponse.json({ error: 'DPGF introuvable' }, { status: 404 })
    }

    const body: unknown = await req.json()
    const parsed = reorderLotsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    // Fetch current lot numbers to detect which lots actually change
    const currentLots = await prisma.lot.findMany({
      where: { dpgfId: params.dpgfId },
      select: { id: true, number: true },
    })
    const currentNumberMap = new Map(currentLots.map((l) => [l.id, l.number]))

    // Update positions/numbers and renumber post refs for changed lots
    await prisma.$transaction(async (tx) => {
      for (const { lotId, position } of parsed.data) {
        await tx.lot.update({
          where: { id: lotId, dpgfId: params.dpgfId },
          data: { position, number: position + 1 },
        })
      }
      for (const { lotId, position } of parsed.data) {
        const newNumber = position + 1
        if (currentNumberMap.get(lotId) !== newNumber) {
          await renumberLotAllPosts(tx, lotId, newNumber)
        }
      }
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('[PATCH /api/dpgf/[dpgfId]/lots/reorder]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
