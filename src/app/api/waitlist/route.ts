export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  firstName: z.string().min(1, 'Prénom requis').max(50),
  lastName: z.string().min(1, 'Nom requis').max(50),
  email: z.string().email('Email invalide'),
  cabinetName: z.string().min(1, 'Nom du cabinet requis').max(100),
  city: z.string().min(1, 'Ville requise').max(100),
  message: z.string().max(1000).optional(),
})

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const { firstName, lastName, email, cabinetName, city, message } = parsed.data

    // Bloquer si un compte actif existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (existingUser) {
      return NextResponse.json(
        { error: 'Un compte existe déjà avec cet email' },
        { status: 409 }
      )
    }

    // Bloquer si une demande est déjà en cours (PENDING)
    const existingEntry = await prisma.waitlistEntry.findUnique({ where: { email } })
    if (existingEntry?.status === 'PENDING') {
      return NextResponse.json(
        { error: 'Une demande est déjà en cours pour cet email' },
        { status: 409 }
      )
    }

    // Si une entrée existe (APPROVED/REJECTED, user supprimé) → réinitialiser
    // Sinon → créer
    await prisma.waitlistEntry.upsert({
      where: { email },
      create: { firstName, lastName, email, cabinetName, city, message: message ?? null },
      update: {
        firstName,
        lastName,
        cabinetName,
        city,
        message: message ?? null,
        status: 'PENDING',
        inviteToken: null,
        approvedAt: null,
      },
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/waitlist]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
