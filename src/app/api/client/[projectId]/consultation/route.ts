import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } })
    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      select: { id: true, name: true, clientUserId: true },
    })

    if (!project || project.clientUserId !== user.id) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    }

    // Récupérer le dernier AO publié au client
    const ao = await prisma.aO.findFirst({
      where: {
        dpgf: { projectId: params.projectId },
        clientPublished: true,
        status: { not: 'ARCHIVED' },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        deadline: true,
        status: true,
        publishedElements: true,
        aoCompanies: {
          select: {
            id: true,
            status: true,
            offer: { select: { isComplete: true, submittedAt: true } },
          },
        },
      },
    })

    if (!ao) {
      return NextResponse.json({ published: false, project: { id: project.id, name: project.name } })
    }

    const publishedElements = (ao.publishedElements ?? {}) as Record<string, boolean>
    const totalInvited = ao.aoCompanies.length
    const totalSubmitted = ao.aoCompanies.filter((c) => c.status === 'SUBMITTED').length

    return NextResponse.json({
      published: true,
      project: { id: project.id, name: project.name },
      ao: {
        id: ao.id,
        name: ao.name,
        deadline: ao.deadline.toISOString(),
        status: ao.status,
        publishedElements,
        stats: {
          totalInvited,
          totalSubmitted,
          responseRate: totalInvited ? Math.round((totalSubmitted / totalInvited) * 100) : 0,
        },
      },
    })
  } catch (error) {
    console.error('[GET /api/client/[projectId]/consultation]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } })
    if (!user || (user.role !== 'ARCHITECT' && user.role !== 'COLLABORATOR')) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Vérifier que le projet appartient à l'agence de l'architecte
    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      select: { agencyId: true },
    })

    if (!project || project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    }

    const body: unknown = await req.json()
    const { aoId, clientPublished, publishedElements } = body as {
      aoId?: string
      clientPublished?: boolean
      publishedElements?: Record<string, boolean>
    }

    if (!aoId) return NextResponse.json({ error: 'aoId requis' }, { status: 422 })

    const ao = await prisma.aO.update({
      where: { id: aoId },
      data: {
        ...(clientPublished !== undefined && { clientPublished }),
        ...(publishedElements !== undefined && { publishedElements }),
      },
      select: { id: true, clientPublished: true, publishedElements: true },
    })

    return NextResponse.json(ao)
  } catch (error) {
    console.error('[PATCH /api/client/[projectId]/consultation]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
