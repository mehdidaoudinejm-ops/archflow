import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { WaitlistApprovedEmail } from '@/emails/WaitlistApprovedEmail'
import { randomBytes } from 'crypto'
import React from 'react'

async function approveEntry(id: string) {
  const entry = await prisma.waitlistEntry.findUnique({ where: { id } })
  if (!entry) return { error: 'Entrée introuvable', status: 404 }
  if (entry.status === 'APPROVED') return { error: 'Déjà approuvé', status: 409 }

  const inviteToken = randomBytes(32).toString('hex')

  await prisma.waitlistEntry.update({
    where: { id },
    data: { status: 'APPROVED', approvedAt: new Date(), inviteToken },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://archflow.fr'
  const inviteUrl = `${appUrl}/register/invite?token=${inviteToken}`

  await sendEmail({
    to: entry.email,
    subject: 'Votre accès ArchFlow est confirmé',
    react: React.createElement(WaitlistApprovedEmail, { firstName: entry.firstName, inviteUrl }),
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
    const result = await approveEntry(params.id)
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result)
  } catch (error) {
    console.error('[POST /api/admin/waitlist/[id]/approve]', error)
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
    const result = await approveEntry(params.id)
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result)
  } catch (error) {
    console.error('[PATCH /api/admin/waitlist/[id]/approve]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
