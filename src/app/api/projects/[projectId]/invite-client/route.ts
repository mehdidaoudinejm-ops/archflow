export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { ClientInvitationEmail } from '@/emails/ClientInvitationEmail'

export async function POST(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR', 'ADMIN'])

    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      include: { clientContact: true },
    })

    if (!project || project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    }

    const email = project.clientContact?.email
    if (!email) {
      return NextResponse.json({ error: 'Aucun email client renseigné dans les informations du projet' }, { status: 400 })
    }

    // Réutiliser le token existant ou en générer un nouveau
    const token = project.clientToken ?? randomBytes(32).toString('hex')

    await prisma.project.update({
      where: { id: params.projectId },
      data: { clientToken: token },
    })

    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000'
    const proto = req.headers.get('x-forwarded-proto') ?? 'https'
    const rawUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${proto}://${host}`
    const appUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`
    const clientLink = `${appUrl}/client/${token}`

    if (process.env.NODE_ENV === 'development') {
      console.log(`\n[DEV INVITE CLIENT] Lien client (${email}):\n${clientLink}\n`)
    }

    const agencyName = user.agency?.name ?? 'Votre architecte'

    await sendEmail({
      to: email,
      subject: `Votre espace projet "${project.name}" est prêt`,
      html: ClientInvitationEmail({ projectName: project.name, agencyName, clientLink }),
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    console.error('[POST /api/projects/[projectId]/invite-client]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
