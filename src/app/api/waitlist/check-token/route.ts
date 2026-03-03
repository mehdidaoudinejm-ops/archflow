import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
    }

    const entry = await prisma.waitlistEntry.findUnique({
      where: { inviteToken: token },
      select: { id: true, firstName: true, lastName: true, email: true, cabinetName: true, status: true },
    })

    if (!entry || entry.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 404 })
    }

    return NextResponse.json(entry)
  } catch (error) {
    console.error('[GET /api/waitlist/check-token]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
