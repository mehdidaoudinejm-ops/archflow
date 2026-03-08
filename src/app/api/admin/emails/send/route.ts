export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AdminAuthError, requireAdmin } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/email'
import { z } from 'zod'

const schema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  segment: z.enum(['TOUS', 'SANS_PROJET', 'SANS_AO', 'INACTIFS_30J']),
  test: z.boolean().optional(), // si true, envoie uniquement à l'admin
})

async function resolveRecipients(segment: string): Promise<string[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  if (segment === 'TOUS') {
    const users = await prisma.user.findMany({
      where: { suspended: false, role: { in: ['ARCHITECT', 'COLLABORATOR'] } },
      select: { email: true },
    })
    return users.map((u) => u.email)
  }

  if (segment === 'SANS_PROJET') {
    // Architectes sans aucun projet dans leur agence
    const agencies = await prisma.agency.findMany({
      where: { projects: { none: {} } },
      include: { users: { select: { email: true }, where: { role: 'ARCHITECT' } } },
    })
    return agencies.flatMap((a) => a.users.map((u) => u.email))
  }

  if (segment === 'SANS_AO') {
    // Architectes avec projets mais sans AO
    const dpgfs = await prisma.dPGF.findMany({
      where: { aos: { none: {} } },
      include: {
        project: {
          include: {
            agency: {
              include: { users: { select: { email: true }, where: { role: 'ARCHITECT' } } },
            },
          },
        },
      },
    })
    const emails = new Set<string>()
    dpgfs.forEach((d) => d.project.agency.users.forEach((u) => emails.add(u.email)))
    return Array.from(emails)
  }

  if (segment === 'INACTIFS_30J') {
    const users = await prisma.user.findMany({
      where: {
        suspended: false,
        role: { in: ['ARCHITECT', 'COLLABORATOR'] },
        OR: [
          { lastSeenAt: null },
          { lastSeenAt: { lte: thirtyDaysAgo } },
        ],
      },
      select: { email: true },
    })
    return users.map((u) => u.email)
  }

  return []
}

function buildHtml(subject: string, body: string): string {
  const escaped = body.replace(/\n/g, '<br>')
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8F8F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F8F6;padding:40px 16px">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #E8E8E3">
      <tr><td style="background:#1A5C3A;padding:24px 32px;border-radius:12px 12px 0 0">
        <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.3px">ArchFlow</span>
      </td></tr>
      <tr><td style="padding:32px">
        <p style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1A1A18">${subject}</p>
        <p style="margin:0;font-size:15px;line-height:1.7;color:#6B6B65">${escaped}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

export async function POST(req: Request) {
  try {
    const session = await requireAdmin()

    const body = await req.json()
    const { subject, body: emailBody, segment, test } = schema.parse(body)

    const html = buildHtml(subject, emailBody)

    if (test) {
      // Envoyer uniquement à l'admin qui lance
      await sendEmail({ to: session.user.email!, subject: `[TEST] ${subject}`, html })
      return NextResponse.json({ ok: true, recipientCount: 1, test: true })
    }

    const recipients = await resolveRecipients(segment)

    if (recipients.length === 0) {
      return NextResponse.json({ ok: true, recipientCount: 0 })
    }

    // Envoi en série pour éviter les rate limits
    let sent = 0
    for (const email of recipients) {
      try {
        await sendEmail({ to: email, subject, html })
        sent++
      } catch (err) {
        console.error(`[admin/emails/send] Erreur pour ${email}:`, err)
      }
    }

    // Log en base
    await prisma.adminEmail.create({
      data: {
        subject,
        body: emailBody,
        segment,
        recipientCount: sent,
        sentBy: session.user.email,
      },
    })

    return NextResponse.json({ ok: true, recipientCount: sent })
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[POST /api/admin/emails/send]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
