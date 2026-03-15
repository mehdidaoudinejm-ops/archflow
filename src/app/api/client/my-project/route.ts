export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/client/my-project — retourne le premier projet lié au CLIENT connecté
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ projectId: null }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email! } })
  if (!user || user.role !== 'CLIENT') return NextResponse.json({ projectId: null }, { status: 403 })

  const project = await prisma.project.findFirst({
    where: { clientUserId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })

  return NextResponse.json({ projectId: project?.id ?? null })
}
