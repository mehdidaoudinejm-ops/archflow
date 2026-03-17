import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])
    const count = await prisma.library.count({ where: { agencyId: user.agencyId! } })
    return NextResponse.json({ count })
  } catch (error) {
    console.error('[GET /api/library/count]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
