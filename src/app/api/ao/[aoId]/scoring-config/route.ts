export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DEFAULT_WEIGHTS } from '@/lib/scoring'

const updateSchema = z.object({
  weightPrice: z.number().int().min(0).max(100),
  weightDocuments: z.number().int().min(0).max(100),
  weightReliability: z.number().int().min(0).max(100),
  weightDivergences: z.number().int().min(0).max(100),
  weightReactivity: z.number().int().min(0).max(100),
}).refine(
  (d) => d.weightPrice + d.weightDocuments + d.weightReliability + d.weightDivergences + d.weightReactivity === 100,
  { message: 'La somme des poids doit être égale à 100' }
)

export async function GET(
  _req: Request,
  { params }: { params: { aoId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const ao = await prisma.aO.findUnique({
      where: { id: params.aoId },
      include: { dpgf: { include: { project: { select: { agencyId: true } } } } },
    })
    if (!ao || ao.dpgf.project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'AO introuvable' }, { status: 404 })
    }

    const config = await prisma.aOScoringConfig.findUnique({ where: { aoId: params.aoId } })

    return NextResponse.json(config ?? { ...DEFAULT_WEIGHTS, aoId: params.aoId, id: null })
  } catch (error) {
    console.error('[GET /api/ao/[aoId]/scoring-config]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { aoId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const ao = await prisma.aO.findUnique({
      where: { id: params.aoId },
      include: { dpgf: { include: { project: { select: { agencyId: true } } } } },
    })
    if (!ao || ao.dpgf.project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'AO introuvable' }, { status: 404 })
    }

    const body: unknown = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' }, { status: 422 })
    }

    const config = await prisma.aOScoringConfig.upsert({
      where: { aoId: params.aoId },
      create: { aoId: params.aoId, ...parsed.data },
      update: parsed.data,
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error('[PATCH /api/ao/[aoId]/scoring-config]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
