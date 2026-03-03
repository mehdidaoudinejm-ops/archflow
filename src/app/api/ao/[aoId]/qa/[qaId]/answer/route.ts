import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: Request,
  { params }: { params: { aoId: string; qaId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const qa = await prisma.qA.findUnique({
      where: { id: params.qaId },
      include: { ao: { include: { dpgf: { include: { project: { select: { agencyId: true } } } } } } },
    })

    if (!qa || qa.aoId !== params.aoId || qa.ao.dpgf.project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'Question introuvable' }, { status: 404 })
    }

    const body: unknown = await req.json()
    const { body: answerBody } = body as { body?: string }

    if (!answerBody?.trim()) {
      return NextResponse.json({ error: 'La réponse ne peut pas être vide' }, { status: 422 })
    }

    // Upsert de la réponse (on peut modifier une réponse existante)
    const answer = await prisma.qAAnswer.upsert({
      where: { qaId: params.qaId },
      update: { body: answerBody.trim(), answeredById: user.id },
      create: { qaId: params.qaId, answeredById: user.id, body: answerBody.trim() },
    })

    // Mettre le statut à ANSWERED
    await prisma.qA.update({
      where: { id: params.qaId },
      data: { status: 'ANSWERED' },
    })

    return NextResponse.json(answer, { status: 201 })
  } catch (error) {
    console.error('[POST /api/ao/[aoId]/qa/[qaId]/answer]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
