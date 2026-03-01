import { SignJWT, jwtVerify } from 'jose'
import { createElement } from 'react'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { InvitationEmail } from '@/emails/InvitationEmail'
import { NewAOEmail } from '@/emails/NewAOEmail'

export interface InviteTokenPayload {
  email: string
  aoId: string
  aoCompanyId: string
}

function getSecret(): Uint8Array {
  const secret = process.env.INVITE_JWT_SECRET
  if (!secret) throw new Error('INVITE_JWT_SECRET manquant')
  return new TextEncoder().encode(secret)
}

function formatDeadline(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export async function generateInviteToken(payload: InviteTokenPayload, deadline: Date): Promise<string> {
  // Token expire 48h après la deadline de l'AO
  const exp = Math.floor(deadline.getTime() / 1000) + 48 * 60 * 60

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(exp)
    .sign(getSecret())
}

export async function verifyInviteToken(token: string): Promise<InviteTokenPayload> {
  const { payload } = await jwtVerify(token, getSecret())
  return payload as unknown as InviteTokenPayload
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
}): Promise<{ type: 'NEW_COMPANY' | 'EXISTING_COMPANY'; aoCompanyId: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // 1. Vérifier si l'email a déjà un compte
  const existingUser = await prisma.user.findUnique({ where: { email } })

  if (existingUser) {
    // Refuser les comptes ARCHITECT / COLLABORATOR / ADMIN
    if (
      existingUser.role === 'ARCHITECT' ||
      existingUser.role === 'COLLABORATOR' ||
      existingUser.role === 'ADMIN'
    ) {
      throw new Error('ARCHITECT_CONFLICT')
    }

    if (existingUser.role === 'COMPANY') {
      // Vérifier si déjà invité à cet AO
      const existing = await prisma.aOCompany.findFirst({
        where: { aoId, companyUserId: existingUser.id },
      })
      if (existing) throw new Error('ALREADY_INVITED')

      // Créer l'AOCompany
      const aoCompany = await prisma.aOCompany.create({
        data: { aoId, companyUserId: existingUser.id, status: 'INVITED' },
      })

      // Générer le token portail
      const token = await generateInviteToken(
        { email, aoId, aoCompanyId: aoCompany.id },
        deadline
      )

      await prisma.aOCompany.update({
        where: { id: aoCompany.id },
        data: { inviteToken: token },
      })

      // Envoyer email "nouvel AO"
      const portalUrl = `${appUrl}/portal/${aoId}?token=${token}`
      await sendEmail({
        to: email,
        subject: `Nouvel appel d'offre — ${aoName}`,
        react: createElement(NewAOEmail, {
          agencyName,
          aoName,
          projectName,
          deadline: formatDeadline(deadline),
          portalUrl,
        }),
      })

      return { type: 'EXISTING_COMPANY', aoCompanyId: aoCompany.id }
    }
  }

  // 2. Nouvel email — créer un utilisateur COMPANY placeholder
  const placeholderUser = existingUser ?? await prisma.user.create({
    data: { email, role: 'COMPANY' },
  })

  // Créer l'AOCompany
  const aoCompany = await prisma.aOCompany.create({
    data: { aoId, companyUserId: placeholderUser.id, status: 'INVITED' },
  })

  // Générer le token d'invitation
  const token = await generateInviteToken(
    { email, aoId, aoCompanyId: aoCompany.id },
    deadline
  )

  await prisma.aOCompany.update({
    where: { id: aoCompany.id },
    data: { inviteToken: token },
  })

  // Envoyer email d'invitation (création de compte)
  const inviteUrl = `${appUrl}/register/company?token=${token}`
  await sendEmail({
    to: email,
    subject: `Invitation à répondre à un appel d'offre — ${aoName}`,
    react: createElement(InvitationEmail, {
      agencyName,
      aoName,
      projectName,
      deadline: formatDeadline(deadline),
      inviteUrl,
    }),
  })

  return { type: 'NEW_COMPANY', aoCompanyId: aoCompany.id }
}
