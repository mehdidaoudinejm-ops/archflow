import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { z } from 'zod'
import React from 'react'
import { BroadcastEmail } from '@/emails/BroadcastEmail'

const schema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
  segment: z.enum(['ALL_ARCHITECTS', 'WAITLIST', 'NO_PROJECT']),
  testOnly: z.boolean().default(false),
})

export async function POST(req: Request) {
  try {
    const session = await requireAdmin()
    if (!session) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const body: unknown = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 422 })

    const { subject, body: emailBody, segment, testOnly } = parsed.data

    // Mode test : envoyer uniquement à l'admin
    if (testOnly) {
      await sendEmail({
        to: session.user.email!,
        subject: `[TEST] ${subject}`,
        react: React.createElement(BroadcastEmail, { subject, body: emailBody }),
      })
      return NextResponse.json({ success: true, recipientCount: 1, testOnly: true })
    }

    // Récupérer les destinataires selon le segment
    let recipients: string[] = []

    if (segment === 'ALL_ARCHITECTS') {
      const users = await prisma.user.findMany({
        where: { role: 'ARCHITECT', suspended: false },
        select: { email: true },
      })
      recipients = users.map(u => u.email)
    } else if (segment === 'WAITLIST') {
      const entries = await prisma.waitlistEntry.findMany({
        where: { status: 'PENDING' },
        select: { email: true },
      })
      recipients = entries.map(e => e.email)
    } else if (segment === 'NO_PROJECT') {
      // Architectes sans aucun projet
      const usersWithProject = await prisma.project.findMany({
        select: { agency: { select: { users: { select: { email: true } } } } },
      })
      const emailsWithProject = new Set(
        usersWithProject.flatMap(p => p.agency.users.map(u => u.email))
      )
      const allArchitects = await prisma.user.findMany({
        where: { role: 'ARCHITECT', suspended: false },
        select: { email: true },
      })
      recipients = allArchitects
        .map(u => u.email)
        .filter(e => !emailsWithProject.has(e))
    }

    // Envoyer les emails (séquentiellement pour éviter le rate limiting)
    let sent = 0
    for (const to of recipients) {
      try {
        await sendEmail({
          to,
          subject,
          react: React.createElement(BroadcastEmail, { subject, body: emailBody }),
        })
        sent++
      } catch (e) {
        console.error(`Failed to send to ${to}:`, e)
      }
    }

    // Enregistrer dans la base
    await prisma.adminEmail.create({
      data: { subject, body: emailBody, segment, recipientCount: sent },
    })

    return NextResponse.json({ success: true, recipientCount: sent })
  } catch (error) {
    console.error('[POST /api/admin/emails/send]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
