import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const PROJECT_LIMITS: Record<string, number> = {
  SOLO: 3,
  STUDIO: 10,
  AGENCY: Infinity,
}

const createProjectSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100),
  address: z.string().max(200).optional(),
  projectType: z.string().max(100).optional(),
  surface: z.number().positive().optional(),
  budget: z.number().positive().optional(),
  startDate: z.string().optional(),
  description: z.string().max(2000).optional(),
  clientFirstName: z.string().max(100).optional(),
  clientLastName: z.string().max(100).optional(),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientPhone: z.string().max(30).optional(),
})

export async function GET() {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    if (!user.agencyId) {
      return NextResponse.json({ error: 'Agence introuvable' }, { status: 400 })
    }

    const projects = await prisma.project.findMany({
      where: { agencyId: user.agencyId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(projects, { status: 200 })
  } catch (error) {
    console.error('[GET /api/projects]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    if (!user.agencyId) {
      return NextResponse.json({ error: 'Agence introuvable' }, { status: 400 })
    }

    // Vérifier limite de projets selon plan
    const agency = await prisma.agency.findUnique({
      where: { id: user.agencyId },
      select: { plan: true },
    })
    const plan = agency?.plan ?? 'SOLO'
    const limit = PROJECT_LIMITS[plan] ?? 3

    const activeCount = await prisma.project.count({
      where: { agencyId: user.agencyId, status: 'ACTIVE' },
    })

    if (activeCount >= limit) {
      return NextResponse.json(
        { error: `Limite de projets atteinte pour votre plan ${plan} (${limit} max). Archivez un projet ou passez à un plan supérieur.` },
        { status: 403 }
      )
    }

    const body: unknown = await req.json()
    const parsed = createProjectSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const { name, address, projectType, surface, budget, startDate, description,
      clientFirstName, clientLastName, clientEmail, clientPhone } = parsed.data

    let clientContactId: string | null = null
    if (clientFirstName?.trim()) {
      const contact = await prisma.contact.create({
        data: {
          agencyId: user.agencyId,
          type: 'CLIENT',
          firstName: clientFirstName.trim(),
          lastName: clientLastName?.trim() ?? null,
          email: clientEmail || null,
          phone: clientPhone?.trim() ?? null,
        },
      })
      clientContactId = contact.id
    }

    const project = await prisma.project.create({
      data: {
        agencyId: user.agencyId,
        name,
        address: address ?? null,
        projectType: projectType ?? null,
        surface: surface ?? null,
        budget: budget ?? null,
        startDate: startDate ? new Date(startDate) : null,
        description: description ?? null,
        clientContactId,
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('[POST /api/projects]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
