import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: Request,
  { params }: { params: { aoId: string } }
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

    if (ao.status === 'CLOSED' || ao.status === 'ARCHIVED') {
      return NextResponse.json({ error: 'Cet AO est déjà clôturé' }, { status: 400 })
    }

    const closed = await prisma.aO.update({
      where: { id: params.aoId },
      data: { status: 'CLOSED' },
    })

    // Mettre à jour le statut de la DPGF
    await prisma.dPGF.update({
      where: { id: ao.dpgfId },
      data: { status: 'CLOSED' },
    })

    return NextResponse.json(closed, { status: 200 })
  } catch (error) {
    console.error('[POST /api/ao/[aoId]/close]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
