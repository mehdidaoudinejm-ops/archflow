export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AdminAuthError, requireAdmin } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/email'
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

    // Approve: generate invite token + send email
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

    await sendEmail({
      to: entry.email,
      subject: 'Votre accès ArchFlow est prêt',
      react: (
        <div style={{ fontFamily: 'sans-serif', maxWidth: 520, margin: '0 auto', color: '#1a1a18' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
            Bienvenue sur ArchFlow, {entry.firstName}&nbsp;!
          </h1>
          <p style={{ color: '#6B6B65', lineHeight: 1.6, marginBottom: 24 }}>
            Votre demande d&apos;accès a été approuvée. Cliquez sur le bouton ci-dessous pour
            créer votre compte.
          </p>
          <a
            href={inviteUrl}
            style={{
              display: 'inline-block',
              background: '#1F6B44',
              color: '#fff',
              padding: '12px 28px',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            Créer mon compte
          </a>
          <p style={{ color: '#9B9B94', fontSize: 13, marginTop: 24 }}>
            Ce lien est valable 7 jours.
          </p>
        </div>
      ),
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
