import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const createProjectSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100),
  address: z.string().max(200).optional(),
  projectType: z.string().max(100).optional(),
  surface: z.number().positive().optional(),
  budget: z.number().positive().optional(),
  startDate: z.string().optional(), // ISO date string
  description: z.string().max(2000).optional(),
})

export async function GET() {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    if (!user.agencyId) {
      return NextResponse.json({ error: 'Agence introuvable' }, { status: 400 })
    }

    const projects = await prisma.project.findMany({
      where: {
        agencyId: user.agencyId,
        status: 'ACTIVE',
      },
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

    const body: unknown = await req.json()
    const parsed = createProjectSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const { name, address, projectType, surface, budget, startDate, description } = parsed.data
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
