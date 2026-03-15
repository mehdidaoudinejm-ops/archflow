import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(
  req: Request,
  { params }: { params: { aoId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const body = await req.json().catch(() => ({})) as {
      outcome?: 'LAUREAT' | 'INFRUCTUEUX'
      awardedCompanyId?: string
    }

    const ao = await prisma.aO.findUnique({
      where: { id: params.aoId },
      include: { dpgf: { include: { project: { select: { agencyId: true } } } } },
    })

    if (!ao || ao.dpgf.project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'AO introuvable' }, { status: 404 })
    }

    const terminalStatuses = ['CLOSED', 'ANALYSED', 'AWARDED', 'INFRUCTUEUX', 'ARCHIVED']
    if (terminalStatuses.includes(ao.status)) {
      return NextResponse.json({ error: 'Cet AO est déjà clôturé' }, { status: 400 })
    }

    let newStatus: 'CLOSED' | 'AWARDED' | 'INFRUCTUEUX' = 'CLOSED'
    let publishedElementsUpdate: Record<string, unknown> | undefined

    if (body.outcome === 'LAUREAT' && body.awardedCompanyId) {
      newStatus = 'AWARDED'
      const existing = (ao.publishedElements ?? {}) as Record<string, unknown>
      publishedElementsUpdate = { ...existing, awardedCompanyId: body.awardedCompanyId }
    } else if (body.outcome === 'INFRUCTUEUX') {
      newStatus = 'INFRUCTUEUX'
    }

    const closed = await prisma.aO.update({
      where: { id: params.aoId },
      data: {
        status: newStatus,
        ...(publishedElementsUpdate ? { publishedElements: publishedElementsUpdate as object } : {}),
      },
    })

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
