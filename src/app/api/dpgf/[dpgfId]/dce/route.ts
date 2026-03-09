import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function checkDpgfAccess(dpgfId: string, agencyId: string) {
  const dpgf = await prisma.dPGF.findUnique({
    where: { id: dpgfId },
    include: { project: { select: { agencyId: true } } },
  })
  if (!dpgf || dpgf.project.agencyId !== agencyId) return null
  return dpgf
}

export async function GET(
  _req: Request,
  { params }: { params: { dpgfId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])
    const dpgf = await checkDpgfAccess(params.dpgfId, user.agencyId!)
    if (!dpgf) return NextResponse.json({ error: 'DQE introuvable' }, { status: 404 })

    const documents = await prisma.document.findMany({
      where: { dpgfId: params.dpgfId },
      orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
      include: { reads: { select: { aoCompanyId: true } } },
    })
    return NextResponse.json(documents)
  } catch (error) {
    console.error('[GET /api/dpgf/[dpgfId]/dce]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: { dpgfId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])
    const dpgf = await checkDpgfAccess(params.dpgfId, user.agencyId!)
    if (!dpgf) return NextResponse.json({ error: 'DQE introuvable' }, { status: 404 })

    if (dpgf.status === 'AO_SENT') {
      return NextResponse.json({ error: 'DQE verrouillé — utilisez "Modifier le DQE" pour débloquer' }, { status: 403 })
    }

    const body: unknown = await req.json()
    const { name, category, fileUrl, isMandatory } = body as {
      name?: string; category?: string; fileUrl?: string; isMandatory?: boolean
    }
    if (!name || !category || !fileUrl) {
      return NextResponse.json({ error: 'name, category et fileUrl sont requis' }, { status: 422 })
    }

    const existing = await prisma.document.findFirst({
      where: { dpgfId: params.dpgfId, name },
      orderBy: { revision: 'desc' },
    })

    const doc = await prisma.document.create({
      data: {
        dpgfId: params.dpgfId,
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
    console.error('[POST /api/dpgf/[dpgfId]/dce]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
