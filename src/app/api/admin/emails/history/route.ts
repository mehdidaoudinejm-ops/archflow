export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AdminAuthError, requireAdmin } from '@/lib/admin-auth'

export async function GET() {
  try {
    await requireAdmin()

    const logs = await prisma.adminEmail.findMany({
      orderBy: { sentAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(logs)
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[GET /api/admin/emails/history]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
