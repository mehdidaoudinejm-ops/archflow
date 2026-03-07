export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AdminAuthError, requireAdmin } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/email'
import { WaitlistInviteEmail } from '@/emails/WaitlistInviteEmail'
import { z } from 'zod'

const schema = z.object({
  action: z.enum(['approve', 'reject']),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()

    const body = await req.json()
    const { action } = schema.parse(body)

    const entry = await prisma.waitlistEntry.findUnique({ where: { id: params.id } })
    if (!entry) {
      return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    }

    if (action === 'reject') {
      const updated = await prisma.waitlistEntry.update({
        where: { id: params.id },
        data: { status: 'REJECTED' },
      })
      return NextResponse.json(updated)
    }

    // Approve: generate invite token + update DB
    const inviteToken = crypto.randomUUID()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const inviteUrl = `${appUrl}/register/invite?token=${inviteToken}`

    const updated = await prisma.waitlistEntry.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED',
        inviteToken,
        approvedAt: new Date(),
      },
    })

    // Envoi email — erreur isolée pour ne pas bloquer la réponse
    try {
      await sendEmail({
        to: entry.email,
        subject: 'Votre accès ArchFlow est prêt',
        react: WaitlistInviteEmail({ firstName: entry.firstName, inviteUrl }),
      })
    } catch (emailError) {
      // L'entrée est approuvée en DB — on log l'erreur sans bloquer
      console.error('[waitlist approve] Échec envoi email:', emailError)
    }

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
