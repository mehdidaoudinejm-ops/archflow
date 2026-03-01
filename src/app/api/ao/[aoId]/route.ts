import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateAOSchema } from '@/lib/validations/ao'

async function checkAOAccess(aoId: string, agencyId: string) {
  const ao = await prisma.aO.findUnique({
    where: { id: aoId },
    include: { dpgf: { include: { project: { select: { agencyId: true } } } } },
  })
  if (!ao || ao.dpgf.project.agencyId !== agencyId) return null
  return ao
}

export async function GET(
  _req: Request,
  { params }: { params: { aoId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const access = await checkAOAccess(params.aoId, user.agencyId!)
    if (!access) {
      return NextResponse.json({ error: 'AO introuvable' }, { status: 404 })
    }

    const ao = await prisma.aO.findUnique({
      where: { id: params.aoId },
      include: {
        aoCompanies: {
          include: {
            offer: { select: { id: true, submittedAt: true, isComplete: true } },
          },
          orderBy: { id: 'asc' },
        },
        documents: { orderBy: { createdAt: 'asc' } },
      },
    })

    return NextResponse.json(ao, { status: 200 })
  } catch (error) {
    console.error('[GET /api/ao/[aoId]]', error)
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

    const access = await checkAOAccess(params.aoId, user.agencyId!)
    if (!access) {
      return NextResponse.json({ error: 'AO introuvable' }, { status: 404 })
    }

    const body: unknown = await req.json()
    const parsed = updateAOSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const { deadline, ...rest } = parsed.data

    const ao = await prisma.aO.update({
      where: { id: params.aoId },
      data: {
        ...rest,
        ...(deadline ? { deadline: new Date(deadline) } : {}),
      },
    })

    // Si l'AO passe en SENT, mettre la DPGF à AO_SENT
    if (parsed.data.status === 'SENT') {
      await prisma.dPGF.update({
        where: { id: access.dpgfId },
        data: { status: 'AO_SENT' },
      })
    }

    return NextResponse.json(ao, { status: 200 })
  } catch (error) {
    console.error('[PATCH /api/ao/[aoId]]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { aoId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const access = await checkAOAccess(params.aoId, user.agencyId!)
    if (!access) {
      return NextResponse.json({ error: 'AO introuvable' }, { status: 404 })
    }

    if (access.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Seul un AO en brouillon peut être supprimé' },
        { status: 400 }
      )
    }

    await prisma.aO.delete({ where: { id: params.aoId } })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('[DELETE /api/ao/[aoId]]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
