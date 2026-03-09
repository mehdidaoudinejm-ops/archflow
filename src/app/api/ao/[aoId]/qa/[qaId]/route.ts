import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const patchQASchema = z.object({
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
})

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  { params }: { params: { aoId: string; qaId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const qa = await prisma.qA.findUnique({
      where: { id: params.qaId },
      include: { ao: { include: { dpgf: { include: { project: { select: { agencyId: true } } } } } } },
    })

    if (!qa || qa.aoId !== params.aoId || qa.ao.dpgf.project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'Question introuvable' }, { status: 404 })
    }

    const body: unknown = await req.json()
    const parsed = patchQASchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 422 })
    }
    const { visibility } = parsed.data

    const updated = await prisma.qA.update({
      where: { id: params.qaId },
      data: {
        ...(visibility !== undefined && { visibility }),
      },
      include: { answer: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/ao/[aoId]/qa/[qaId]]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
