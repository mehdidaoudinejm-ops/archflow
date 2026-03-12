export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, AuthError } from '@/lib/auth'
import { z } from 'zod'
import { inviteCollaborator } from '@/lib/collaborator-invite'

const inviteSchema = z.object({
  email: z.string().email('Email invalide'),
})

export async function GET() {
  try {
    const user = await requireRole(['ARCHITECT'])

    if (!user.agencyId) {
      return NextResponse.json({ error: 'Agence introuvable' }, { status: 400 })
    }

    const members = await prisma.user.findMany({
      where: { agencyId: user.agencyId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        suspended: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    const agency = await prisma.agency.findUnique({
      where: { id: user.agencyId },
      select: { plan: true },
    })

    return NextResponse.json({ members, plan: agency?.plan ?? 'SOLO' })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[GET /api/settings/team]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole(['ARCHITECT'])

    if (!user.agencyId) {
      return NextResponse.json({ error: 'Agence introuvable' }, { status: 400 })
    }

    const body: unknown = await req.json()
    const parsed = inviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Email invalide' }, { status: 422 })
    }

    const { email } = parsed.data

    const agency = await prisma.agency.findUnique({
      where: { id: user.agencyId },
      select: { name: true },
    })

    const result = await inviteCollaborator({
      email,
      agencyId: user.agencyId,
      agencyName: agency?.name ?? 'ArchFlow',
      invitedById: user.id,
    })

    return NextResponse.json({ ok: true, ...result }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    if (error instanceof Error) {
      if (error.message === 'PLAN_LIMIT_REACHED') {
        return NextResponse.json({ error: 'Limite de membres atteinte pour votre plan' }, { status: 403 })
      }
      if (error.message === 'ALREADY_MEMBER') {
        return NextResponse.json({ error: 'Cet utilisateur est déjà membre de votre agence' }, { status: 409 })
      }
      if (error.message === 'EMAIL_TAKEN') {
        return NextResponse.json({ error: 'Cet email est déjà utilisé sur ArchFlow' }, { status: 409 })
      }
    }
    console.error('[POST /api/settings/team]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
