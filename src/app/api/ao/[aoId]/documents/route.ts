import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: { aoId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const ao = await prisma.aO.findUnique({
      where: { id: params.aoId },
      include: { dpgf: { include: { project: { select: { agencyId: true } } } } },
    })

    if (!ao || ao.dpgf.project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'AO introuvable' }, { status: 404 })
    }

    const documents = await prisma.document.findMany({
      where: { aoId: params.aoId },
      orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
      include: { reads: { select: { aoCompanyId: true } } },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error('[GET /api/ao/[aoId]/documents]', error)
    if (error instanceof Error && error.name === 'AuthError') {
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
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const ao = await prisma.aO.findUnique({
      where: { id: params.aoId },
      include: { dpgf: { include: { project: { select: { agencyId: true } } } } },
    })

    if (!ao || ao.dpgf.project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'AO introuvable' }, { status: 404 })
    }

    const body: unknown = await req.json()
    const { name, category, fileUrl, isMandatory } = body as {
      name?: string
      category?: string
      fileUrl?: string
      isMandatory?: boolean
    }

    if (!name || !category || !fileUrl) {
      return NextResponse.json({ error: 'name, category et fileUrl sont requis' }, { status: 422 })
    }

    // Incrémenter la révision si un fichier du même nom existe
    const existing = await prisma.document.findFirst({
      where: { aoId: params.aoId, name },
      orderBy: { revision: 'desc' },
    })

    const doc = await prisma.document.create({
      data: {
        aoId: params.aoId,
        name,
        category,
        fileUrl,
        isMandatory: isMandatory ?? false,
        revision: existing ? existing.revision + 1 : 1,
        uploadedById: user.id,
      },
    })

    return NextResponse.json(doc, { status: 201 })
  } catch (error) {
    console.error('[POST /api/ao/[aoId]/documents]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
