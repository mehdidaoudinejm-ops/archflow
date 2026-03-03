import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const createProjectSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100),
  address: z.string().max(200).optional(),
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

    const project = await prisma.project.create({
      data: {
        agencyId: user.agencyId,
        name: parsed.data.name,
        address: parsed.data.address,
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
