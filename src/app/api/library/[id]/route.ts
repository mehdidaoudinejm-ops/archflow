import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const item = await prisma.library.findUnique({ where: { id: params.id } })
    if (!item || item.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    await prisma.library.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/library/[id]]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
