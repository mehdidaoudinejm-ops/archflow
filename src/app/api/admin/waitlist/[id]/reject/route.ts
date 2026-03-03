import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { WaitlistRejectedEmail } from '@/emails/WaitlistRejectedEmail'
import React from 'react'

async function rejectEntry(id: string) {
  const entry = await prisma.waitlistEntry.findUnique({ where: { id } })
  if (!entry) return { error: 'Entrée introuvable', status: 404 }

  await prisma.waitlistEntry.update({
    where: { id },
    data: { status: 'REJECTED' },
  })

  await sendEmail({
    to: entry.email,
    subject: 'Votre demande d\'accès ArchFlow',
    react: React.createElement(WaitlistRejectedEmail, {
      firstName: entry.firstName,
    }),
  })

  return { success: true }
}

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin()
    if (!session) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    const result = await rejectEntry(params.id)
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result)
  } catch (error) {
    console.error('[POST /api/admin/waitlist/[id]/reject]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin()
    if (!session) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    const result = await rejectEntry(params.id)
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result)
  } catch (error) {
    console.error('[PATCH /api/admin/waitlist/[id]/reject]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
