import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  CLOSED: ['ANALYSED'],
  ANALYSED: ['AWARDED'],
}

const schema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ANALYSED') }),
  z.object({ status: z.literal('AWARDED'), awardedCompanyId: z.string() }),
])

export async function PATCH(
  req: Request,
  { params }: { params: { aoId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const body = schema.parse(await req.json())

    const ao = await prisma.aO.findUnique({
      where: { id: params.aoId },
      include: { dpgf: { include: { project: { select: { agencyId: true } } } } },
    })

    if (!ao || ao.dpgf.project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'AO introuvable' }, { status: 404 })
    }

    const allowed = ALLOWED_TRANSITIONS[ao.status] ?? []
    if (!allowed.includes(body.status)) {
      return NextResponse.json(
        { error: `Transition ${ao.status} → ${body.status} non autorisée` },
        { status: 422 }
      )
    }

    const existing = (ao.publishedElements ?? {}) as Record<string, unknown>
    const updated = await prisma.aO.update({
      where: { id: params.aoId },
      data: {
        status: body.status,
        ...(body.status === 'AWARDED'
          ? { publishedElements: { ...existing, awardedCompanyId: body.awardedCompanyId } }
          : {}),
      },
      select: { status: true, publishedElements: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/ao/[aoId]/status]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
