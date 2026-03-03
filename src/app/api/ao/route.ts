import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAOSchema } from '@/lib/validations/ao'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const body: unknown = await req.json()
    const parsed = createAOSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const { dpgfId, name, lotIds, deadline, instructions, allowCustomQty, isPaid, paymentAmount, requiredDocs } =
      parsed.data

    // Vérifier que la DPGF appartient à l'agence de l'utilisateur
    const dpgf = await prisma.dPGF.findUnique({
      where: { id: dpgfId },
      include: { project: { select: { agencyId: true } } },
    })

    if (!dpgf || dpgf.project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'DPGF introuvable' }, { status: 404 })
    }

    const ao = await prisma.aO.create({
      data: {
        dpgfId,
        name,
        lotIds,
        deadline: new Date(deadline),
        instructions: instructions ?? null,
        allowCustomQty: allowCustomQty ?? true,
        isPaid: isPaid ?? false,
        paymentAmount: paymentAmount ?? null,
        requiredDocs: requiredDocs ?? undefined,
        status: 'DRAFT',
        createdById: user.id,
      },
    })

    return NextResponse.json(ao, { status: 201 })
  } catch (error) {
    console.error('[POST /api/ao]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
