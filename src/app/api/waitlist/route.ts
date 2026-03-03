import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { WaitlistConfirmationEmail } from '@/emails/WaitlistConfirmationEmail'
import { WaitlistAdminEmail } from '@/emails/WaitlistAdminEmail'
import React from 'react'

const waitlistSchema = z.object({
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
    const parsed = waitlistSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const { firstName, lastName, email, cabinetName, city, message } = parsed.data

    // Vérifier si l'email est déjà en liste d'attente
    const existing = await prisma.waitlistEntry.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Une demande existe déjà avec cet email' },
        { status: 409 }
      )
    }

    // Créer l'entrée
    await prisma.waitlistEntry.create({
      data: { firstName, lastName, email, cabinetName, city, message },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://archflow.fr'

    // Email de confirmation à l'utilisateur
    await sendEmail({
      to: email,
      subject: 'Votre demande d\'accès ArchFlow a bien été reçue',
      react: React.createElement(WaitlistConfirmationEmail, { firstName, cabinetName }),
    })

    // Notification aux admins
    const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
    for (const adminEmail of adminEmails) {
      await sendEmail({
        to: adminEmail,
        subject: `Nouvelle demande d'accès ArchFlow — ${firstName} ${lastName} — ${cabinetName}`,
        react: React.createElement(WaitlistAdminEmail, {
          firstName,
          lastName,
          cabinetName,
          city,
          email,
          message,
          adminUrl: `${appUrl}/admin/waitlist`,
        }),
      })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/waitlist]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
