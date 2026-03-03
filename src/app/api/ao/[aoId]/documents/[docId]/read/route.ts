import { NextResponse } from 'next/server'
import { requirePortalAuth } from '@/lib/portal-auth'
import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'

export async function POST(
  req: Request,
  { params }: { params: { aoId: string; docId: string } }
) {
  try {
    const { aoCompany } = await requirePortalAuth(req, params.aoId)

    const doc = await prisma.document.findUnique({ where: { id: params.docId } })
    if (!doc || doc.aoId !== params.aoId) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    }

    await prisma.documentRead.upsert({
      where: { documentId_aoCompanyId: { documentId: params.docId, aoCompanyId: aoCompany.id } },
      update: { readAt: new Date() },
      create: { documentId: params.docId, aoCompanyId: aoCompany.id },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[POST /api/ao/[aoId]/documents/[docId]/read]', error)
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
