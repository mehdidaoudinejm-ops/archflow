export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AdminAuthError, requireAdmin } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/email'
import { WaitlistInviteEmail } from '@/emails/WaitlistInviteEmail'
import { z } from 'zod'

const schema = z.object({
  action: z.enum(['approve', 'reject', 'resend']),
})

async function sendInviteEmail(email: string, firstName: string, inviteToken: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const inviteUrl = `${appUrl}/register/invite?token=${inviteToken}`
  try {
    await sendEmail({
      to: email,
      subject: 'Votre accès ArchFlow est prêt',
      react: WaitlistInviteEmail({ firstName, inviteUrl }),
    })
  } catch (emailError) {
    console.error('[waitlist] Échec envoi email:', emailError)
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()

    const body = await req.json()
    const { action } = schema.parse(body)

    const entry = await prisma.waitlistEntry.findUnique({ where: { id: params.id } })
    if (!entry) {
      return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    }

    // Rejeter
    if (action === 'reject') {
      const updated = await prisma.waitlistEntry.update({
        where: { id: params.id },
        data: { status: 'REJECTED' },
      })
      return NextResponse.json(updated)
    }

    // Renvoyer l'invitation (déjà approuvé — regénère le token)
    if (action === 'resend') {
      if (entry.status !== 'APPROVED') {
        return NextResponse.json({ error: 'Entrée non approuvée' }, { status: 400 })
      }
      const inviteToken = crypto.randomUUID()
      await prisma.waitlistEntry.update({
        where: { id: params.id },
        data: { inviteToken, approvedAt: new Date() }, // reset expiration 7j
      })
      await sendInviteEmail(entry.email, entry.firstName, inviteToken)
      return NextResponse.json({ ok: true })
    }

    // Approuver
    const inviteToken = crypto.randomUUID()
    const updated = await prisma.waitlistEntry.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED',
        inviteToken,
        approvedAt: new Date(),
      },
    })
    await sendInviteEmail(entry.email, entry.firstName, inviteToken)

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
