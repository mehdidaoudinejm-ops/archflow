import { SignJWT, jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { CollaboratorInviteEmail } from '@/emails/CollaboratorInviteEmail'

export interface CollaboratorTokenPayload {
  email: string
  agencyId: string
  invitedById: string
}

const PLAN_LIMITS: Record<string, number> = {
  SOLO: 1,
  STUDIO: 3,
  AGENCY: 10,
}

function getSecret(): Uint8Array {
  const secret = process.env.INVITE_JWT_SECRET
  if (!secret) throw new Error('INVITE_JWT_SECRET manquant')
  return new TextEncoder().encode(secret)
}

export async function generateCollaboratorToken(payload: CollaboratorTokenPayload): Promise<string> {
  // Token expires in 7 days
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(exp)
    .sign(getSecret())
}

export async function verifyCollaboratorToken(token: string): Promise<CollaboratorTokenPayload> {
  const { payload } = await jwtVerify(token, getSecret())
  return payload as unknown as CollaboratorTokenPayload
}

export async function inviteCollaborator({
  email,
  agencyId,
  agencyName,
  invitedById,
}: {
  email: string
  agencyId: string
  agencyName: string
  invitedById: string
}): Promise<{ devLink?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // 1. Check plan limit
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } })
  if (!agency) throw new Error('AGENCY_NOT_FOUND')

  const limit = PLAN_LIMITS[agency.plan] ?? 1
  const currentCount = await prisma.user.count({
    where: { agencyId, suspended: false },
  })
  if (currentCount >= limit) {
    throw new Error('PLAN_LIMIT_REACHED')
  }

  // 2. Check if email already exists in the agency
  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser?.agencyId === agencyId) {
    throw new Error('ALREADY_MEMBER')
  }
  if (existingUser) {
    throw new Error('EMAIL_TAKEN')
  }

  // 3. Generate token
  const token = await generateCollaboratorToken({ email, agencyId, invitedById })

  // 4. Create placeholder user (COLLABORATOR, no account yet)
  await prisma.user.upsert({
    where: { email },
    create: { email, role: 'COLLABORATOR' },
    update: {},
  })

  // 5. Send email
  const inviteUrl = `${appUrl}/register/collaborator?token=${token}`

  if (process.env.NODE_ENV === 'development') {
    console.log(`\n[DEV INVITE] Lien inscription collaborateur (${email}):\n${inviteUrl}\n`)
  }

  await sendEmail({
    to: email,
    subject: `Invitation à rejoindre ${agencyName} sur ArchFlow`,
    html: CollaboratorInviteEmail({ agencyName, inviteUrl }),
  })

  return {
    ...(process.env.NODE_ENV === 'development' && { devLink: inviteUrl }),
  }
}
