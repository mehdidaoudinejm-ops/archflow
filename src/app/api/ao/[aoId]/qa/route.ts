import { NextResponse } from 'next/server'
import { requireRole, AuthError } from '@/lib/auth'
import { requirePortalAuth } from '@/lib/portal-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params }: { params: { aoId: string } }
) {
  try {
    // Essayer l'auth architecte
    try {
      const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

      const ao = await prisma.aO.findUnique({
        where: { id: params.aoId },
        include: { dpgf: { include: { project: { select: { agencyId: true } } } } },
      })

      if (!ao || ao.dpgf.project.agencyId !== user.agencyId) {
        return NextResponse.json({ error: 'AO introuvable' }, { status: 404 })
      }

      const qas = await prisma.qA.findMany({
        where: { aoId: params.aoId },
        orderBy: { createdAt: 'desc' },
        include: {
          answer: true,
          aoCompany: { select: { companyUserId: true } },
        },
      })

      // Récupérer les utilisateurs entreprises séparément
      const companyUserIds = Array.from(new Set(qas.map((q) => q.aoCompany.companyUserId)))
      const companyUsers = await prisma.user.findMany({
        where: { id: { in: companyUserIds } },
        select: { id: true, firstName: true, lastName: true, agency: { select: { name: true } } },
      })
      const companyUserMap = new Map(companyUsers.map((u) => [u.id, u]))

      const enriched = qas.map((q) => ({
        ...q,
        companyUser: companyUserMap.get(q.aoCompany.companyUserId) ?? null,
      }))

      return NextResponse.json(enriched)
    } catch (archErr) {
      if (!(archErr instanceof AuthError)) throw archErr
    }

    // Fallback : auth portail (entreprise)
    const { aoCompany } = await requirePortalAuth(req, params.aoId)

    const qas = await prisma.qA.findMany({
      where: {
        aoId: params.aoId,
        OR: [
          { visibility: 'PUBLIC' },
          { aoCompanyId: aoCompany.id },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: { answer: true },
    })

    // Masquer l'identité de l'émetteur pour les Q&A publics (sauf les siennes)
    const sanitized = qas.map((qa) => ({
      ...qa,
      isOwn: qa.aoCompanyId === aoCompany.id,
      aoCompanyId: undefined,
    }))

    return NextResponse.json(sanitized)
  } catch (error) {
    console.error('[GET /api/ao/[aoId]/qa]', error)
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: { aoId: string } }
) {
  try {
    const { aoCompany } = await requirePortalAuth(req, params.aoId)

    const body: unknown = await req.json()
    const { title, body: qaBody, visibility, postRef } = body as {
      title?: string
      body?: string
      visibility?: 'PUBLIC' | 'PRIVATE'
      postRef?: string
    }

    if (!title?.trim() || !qaBody?.trim()) {
      return NextResponse.json({ error: 'Le titre et le corps sont requis' }, { status: 422 })
    }

    const qa = await prisma.qA.create({
      data: {
        aoId: params.aoId,
        aoCompanyId: aoCompany.id,
        title: title.trim(),
        body: qaBody.trim(),
        visibility: visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
        postRef: postRef ?? null,
        status: 'PENDING',
      },
      include: { answer: true },
    })

    return NextResponse.json(qa, { status: 201 })
  } catch (error) {
    console.error('[POST /api/ao/[aoId]/qa]', error)
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
