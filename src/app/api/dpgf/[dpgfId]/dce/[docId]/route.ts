import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function checkDocAccess(dpgfId: string, docId: string, agencyId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: docId },
    include: { dpgf: { include: { project: { select: { agencyId: true } } } } },
  })
  if (!doc || doc.dpgfId !== dpgfId || doc.dpgf.project.agencyId !== agencyId) return null
  return doc
}

export async function PATCH(
  req: Request,
  { params }: { params: { dpgfId: string; docId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])
    const doc = await checkDocAccess(params.dpgfId, params.docId, user.agencyId!)
    if (!doc) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })

    const body: unknown = await req.json()
    const { name, category, isMandatory } = body as {
      name?: string; category?: string; isMandatory?: boolean
    }
    const updated = await prisma.document.update({
      where: { id: params.docId },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(isMandatory !== undefined && { isMandatory }),
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/dpgf/[dpgfId]/dce/[docId]]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { dpgfId: string; docId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])
    const doc = await checkDocAccess(params.dpgfId, params.docId, user.agencyId!)
    if (!doc) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })

    await prisma.document.delete({ where: { id: params.docId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /api/dpgf/[dpgfId]/dce/[docId]]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
