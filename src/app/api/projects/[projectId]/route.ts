import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      include: {
        clientContact: true,
        dpgfs: {
          select: { id: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    }

    if (project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    return NextResponse.json(project, { status: 200 })
  } catch (error) {
    console.error('[GET /api/projects/[projectId]]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().max(200).optional().nullable(),
  projectType: z.string().max(100).optional().nullable(),
  surface: z.number().positive().optional().nullable(),
  budget: z.number().positive().optional().nullable(),
  startDate: z.string().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  clientFirstName: z.string().max(100).optional().nullable(),
  clientLastName: z.string().max(100).optional().nullable(),
  clientEmail: z.string().email().optional().or(z.literal('')).nullable(),
  clientPhone: z.string().max(30).optional().nullable(),
})

export async function PATCH(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      include: { clientContact: true },
    })

    if (!project || project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    }

    const body: unknown = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 422 })
    }

    const { name, address, projectType, surface, budget, startDate, description, status,
      clientFirstName, clientLastName, clientEmail, clientPhone } = parsed.data

    let clientContactId = project.clientContactId
    if (clientFirstName !== undefined) {
      if (clientFirstName && clientFirstName.trim()) {
        if (clientContactId) {
          await prisma.contact.update({
            where: { id: clientContactId },
            data: {
              firstName: clientFirstName.trim(),
              lastName: clientLastName?.trim() ?? null,
              email: clientEmail || null,
              phone: clientPhone?.trim() ?? null,
            },
          })
        } else {
          const contact = await prisma.contact.create({
            data: {
              agencyId: user.agencyId!,
              type: 'CLIENT',
              firstName: clientFirstName.trim(),
              lastName: clientLastName?.trim() ?? null,
              email: clientEmail || null,
              phone: clientPhone?.trim() ?? null,
            },
          })
          clientContactId = contact.id
        }
      }
    }

    const updated = await prisma.project.update({
      where: { id: params.projectId },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(projectType !== undefined && { projectType }),
        ...(surface !== undefined && { surface }),
        ...(budget !== undefined && { budget }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        clientContactId,
      },
      include: { clientContact: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/projects/[projectId]]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT'])

    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      include: {
        dpgfs: {
          include: {
            aos: {
              where: { status: { in: ['SENT', 'IN_PROGRESS'] } },
              select: { id: true },
            },
          },
        },
      },
    })

    if (!project || project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    }

    const hasActiveAO = project.dpgfs.some((d) => d.aos.length > 0)
    if (hasActiveAO) {
      return NextResponse.json(
        { error: 'Impossible de supprimer un projet avec un AO en cours. Clôturez l\'AO d\'abord.' },
        { status: 400 }
      )
    }

    await prisma.project.delete({ where: { id: params.projectId } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /api/projects/[projectId]]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
