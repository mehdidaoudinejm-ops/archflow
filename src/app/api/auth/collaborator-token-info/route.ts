export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCollaboratorToken } from '@/lib/collaborator-invite'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 })

    let payload: { email: string; agencyId: string; invitedById: string }
    try {
      payload = await verifyCollaboratorToken(token)
    } catch {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 400 })
    }

    const agency = await prisma.agency.findUnique({
      where: { id: payload.agencyId },
      select: { name: true },
    })

    if (!agency) {
      return NextResponse.json({ error: 'Invitation invalide' }, { status: 400 })
    }

    return NextResponse.json({ email: payload.email, agencyName: agency.name })
  } catch (error) {
    console.error('[GET /api/auth/collaborator-token-info]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
