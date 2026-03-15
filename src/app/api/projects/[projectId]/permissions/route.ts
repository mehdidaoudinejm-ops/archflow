import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET — liste les collaborateurs de l'agence avec leur statut d'accès au projet
export async function GET(
  _req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      select: { agencyId: true },
    })

    if (!project || project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    }

    const [collaborators, permissions] = await Promise.all([
      prisma.user.findMany({
        where: { agencyId: user.agencyId, role: 'COLLABORATOR' },
        select: { id: true, firstName: true, lastName: true, email: true },
      }),
      prisma.projectPermission.findMany({
        where: { projectId: params.projectId },
        select: { userId: true },
      }),
    ])

    const permittedUserIds = new Set(permissions.map((p) => p.userId))

    return NextResponse.json(
      collaborators.map((c) => ({ ...c, hasAccess: permittedUserIds.has(c.id) }))
    )
  } catch (error) {
    console.error('[GET /api/projects/[projectId]/permissions]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST — donne l'accès à un collaborateur
export async function POST(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT'])

    const { userId } = await req.json() as { userId: string }

    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      select: { agencyId: true },
    })

    if (!project || project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    }

    // Vérifier que l'user est bien un collaborateur de l'agence
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { agencyId: true, role: true },
    })

    if (!target || target.agencyId !== user.agencyId || target.role !== 'COLLABORATOR') {
      return NextResponse.json({ error: 'Collaborateur introuvable' }, { status: 404 })
    }

    // Upsert permission
    await prisma.projectPermission.upsert({
      where: { projectId_userId_module: { projectId: params.projectId, userId, module: 'dpgf' } },
      create: { projectId: params.projectId, userId, module: 'dpgf', permissions: { canEdit: true, canSeeEstimate: false } },
      update: {},
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[POST /api/projects/[projectId]/permissions]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE — retire l'accès à un collaborateur
export async function DELETE(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT'])

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })

    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      select: { agencyId: true },
    })

    if (!project || project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    }

    await prisma.projectPermission.deleteMany({
      where: { projectId: params.projectId, userId },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /api/projects/[projectId]/permissions]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
