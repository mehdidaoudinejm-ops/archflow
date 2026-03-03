import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await requireAdmin()
    if (!session) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const emails = await prisma.adminEmail.findMany({
      orderBy: { sentAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(emails)
  } catch (error) {
    console.error('[GET /api/admin/emails]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
