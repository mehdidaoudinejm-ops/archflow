export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR', 'COMPANY'])
    await prisma.notification.updateMany({
      where: { id: params.id, userId: user.id },
      data: { readAt: new Date() },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: (error as { message: string }).message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
