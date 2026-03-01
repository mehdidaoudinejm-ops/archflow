import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { inviteCompanySchema } from '@/lib/validations/ao'
import { inviteCompany } from '@/lib/invite'

export async function POST(
  req: Request,
  { params }: { params: { aoId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    // Vérifier que l'AO appartient à l'agence
    const ao = await prisma.aO.findUnique({
      where: { id: params.aoId },
      include: {
        dpgf: {
          include: {
            project: { select: { agencyId: true, name: true } },
          },
        },
      },
    })

    if (!ao || ao.dpgf.project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'AO introuvable' }, { status: 404 })
    }

    if (ao.status === 'CLOSED' || ao.status === 'ARCHIVED') {
      return NextResponse.json({ error: 'Cet AO est clôturé' }, { status: 400 })
    }

    const body: unknown = await req.json()
    const parsed = inviteCompanySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const { email } = parsed.data

    const result = await inviteCompany({
      email,
      aoId: params.aoId,
      agencyName: user.agency?.name ?? 'ArchFlow',
      aoName: ao.name,
      projectName: ao.dpgf.project.name,
      deadline: ao.deadline,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[POST /api/ao/[aoId]/invite]', error)

    if (error instanceof Error) {
      if (error.name === 'AuthError') {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
      if (error.message === 'ARCHITECT_CONFLICT') {
        return NextResponse.json(
          { error: 'Cet email appartient déjà à un compte architecte' },
          { status: 409 }
        )
      }
      if (error.message === 'ALREADY_INVITED') {
        return NextResponse.json(
          { error: 'Cette entreprise a déjà été invitée à cet AO' },
          { status: 409 }
        )
      }
    }

    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
