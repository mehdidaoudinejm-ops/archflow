export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
  }

  // Validation basique du format UUID pour éviter des requêtes DB inutiles
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(token)) {
    return NextResponse.json({ error: 'Invitation invalide' }, { status: 404 })
  }

  const entry = await prisma.waitlistEntry.findUnique({
    where: { inviteToken: token },
    select: { email: true, firstName: true, lastName: true, status: true, approvedAt: true },
  })

  if (!entry || entry.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Invitation invalide' }, { status: 404 })
  }

  // Vérifier l'expiration (7 jours)
  if (entry.approvedAt) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    if (entry.approvedAt < sevenDaysAgo) {
      return NextResponse.json({ error: 'Invitation expirée' }, { status: 404 })
    }
  }

  return NextResponse.json({
    email: entry.email,
    firstName: entry.firstName,
    lastName: entry.lastName,
  })
}
