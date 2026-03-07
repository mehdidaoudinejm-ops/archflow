export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AdminAuthError, requireAdmin } from '@/lib/admin-auth'

export async function GET() {
  try {
    await requireAdmin()

    const users = await prisma.user.findMany({
      include: { agency: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
