import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { NewAOEmail } from '@/emails/NewAOEmail'

// Token = opaque UUID stored in AOCompany.inviteToken.
// No expiry, no JWT — verified by DB lookup only.

function formatDeadline(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function buildPortalUrl(aoId: string, token: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return `${appUrl}/portal/${aoId}?token=${token}`
}

export async function inviteCompany({
  email,
  aoId,
  agencyName,
  aoName,
  projectName,
  deadline,
}: {
  email: string
  aoId: string
  agencyName: string
  aoName: string
  projectName: string
  deadline: Date
}): Promise<{ aoCompanyId: string; portalUrl: string }> {
  // Bloquer les comptes architecte/admin
  const existingUser = await prisma.user.findUnique({ where: { email } })

  if (
    existingUser?.role === 'ARCHITECT' ||
    existingUser?.role === 'COLLABORATOR' ||
    existingUser?.role === 'ADMIN'
  ) {
    throw new Error('ARCHITECT_CONFLICT')
  }

  // Vérifier si déjà invité à cet AO
  if (existingUser) {
    const alreadyInvited = await prisma.aOCompany.findFirst({
      where: { aoId, companyUserId: existingUser.id },
    })
    if (alreadyInvited) throw new Error('ALREADY_INVITED')
  }

  // Créer ou réutiliser le User placeholder
  const user = existingUser ?? await prisma.user.create({
    data: { email, role: 'COMPANY' },
  })

  // Token opaque permanent
  const token = randomUUID()

  const aoCompany = await prisma.aOCompany.create({
    data: {
      aoId,
      companyUserId: user.id,
      status: 'INVITED',
      inviteToken: token,
    },
  })

  const portalUrl = buildPortalUrl(aoId, token)

  await sendEmail({
    to: email,
    subject: `Invitation à répondre à un appel d'offre — ${aoName}`,
    html: NewAOEmail({
      agencyName,
      aoName,
      projectName,
      deadline: formatDeadline(deadline),
      portalUrl,
    }),
  })

  return { aoCompanyId: aoCompany.id, portalUrl }
}

export async function resendInvite({
  aoCompanyId,
  agencyName,
  aoName,
  projectName,
  deadline,
}: {
  aoCompanyId: string
  agencyName: string
  aoName: string
  projectName: string
  deadline: Date
}): Promise<void> {
  const aoCompany = await prisma.aOCompany.findUnique({
    where: { id: aoCompanyId },
    select: { inviteToken: true, aoId: true, companyUserId: true },
  })

  if (!aoCompany?.inviteToken) throw new Error('Invitation introuvable')

  const companyUser = await prisma.user.findUnique({
    where: { id: aoCompany.companyUserId },
    select: { email: true },
  })

  if (!companyUser) throw new Error('Utilisateur introuvable')

  const portalUrl = buildPortalUrl(aoCompany.aoId, aoCompany.inviteToken)

  await sendEmail({
    to: companyUser.email,
    subject: `Rappel — Appel d'offre : ${aoName}`,
    html: NewAOEmail({
      agencyName,
      aoName,
      projectName,
      deadline: formatDeadline(deadline),
      portalUrl,
    }),
  })
}
