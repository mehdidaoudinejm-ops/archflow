import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  status: z.enum(['PENDING', 'VALID', 'REJECTED', 'EXPIRED']),
  rejectionReason: z.string().max(500).optional(),
  expiresAt: z.string().datetime().optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: { aoId: string; companyId: string; docId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    // Vérifier que l'AO appartient à l'agence
    const ao = await prisma.aO.findUnique({
      where: { id: params.aoId },
      include: { dpgf: { include: { project: { select: { agencyId: true } } } } },
    })

    if (!ao || ao.dpgf.project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'AO introuvable' }, { status: 404 })
    }

    // Vérifier que l'entreprise appartient à cet AO
    const aoCompany = await prisma.aOCompany.findUnique({
      where: { id: params.companyId },
    })

    if (!aoCompany || aoCompany.aoId !== params.aoId) {
      return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 })
    }

    // Vérifier que le doc appartient à cette entreprise
    const doc = await prisma.adminDoc.findUnique({
      where: { id: params.docId },
    })

    if (!doc || doc.aoCompanyId !== params.companyId) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    }

    const body: unknown = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 422 })
    }

    const { status, rejectionReason, expiresAt } = parsed.data

    const updated = await prisma.adminDoc.update({
      where: { id: params.docId },
      data: {
        status,
        rejectionReason: status === 'REJECTED' ? (rejectionReason ?? null) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/ao/[aoId]/companies/[companyId]/admin-docs/[docId]]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
