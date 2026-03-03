import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin()
    if (!session) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    await prisma.user.update({
      where: { id: params.id },
      data: { suspended: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[PATCH /api/admin/users/[id]/reactivate]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
