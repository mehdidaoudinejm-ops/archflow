import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { ClientInvitationEmail } from '@/emails/ClientInvitationEmail'

export const dynamic = 'force-dynamic'

export async function POST(
  _req: Request,
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

    // Conflit : email déjà utilisé par un autre rôle
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing && existing.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Cet email appartient déjà à un compte non-client' }, { status: 409 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const redirectTo = `${appUrl}/client/${params.projectId}`

    // Générer le magic link Supabase (crée le compte Auth si inexistant)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    })

    if (linkError || !linkData) {
      console.error('[invite-client] generateLink error:', linkError)
      return NextResponse.json({ error: 'Erreur lors de la génération du lien' }, { status: 500 })
    }

    const supabaseUserId = linkData.user.id
    const magicLink = linkData.properties.action_link

    // Créer ou retrouver le User Prisma CLIENT
    const clientUser = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { id: supabaseUserId, email, role: 'CLIENT' },
    })

    // Lier le client au projet
    await prisma.project.update({
      where: { id: params.projectId },
      data: { clientUserId: clientUser.id },
    })

    // Envoyer l'email
    const agencyName = user.agency?.name ?? 'Votre architecte'
    const projectName = project.name

    if (process.env.NODE_ENV === 'development') {
      console.log(`\n[DEV INVITE CLIENT] Lien magic (${email}):\n${magicLink}\n`)
    }

    await sendEmail({
      to: email,
      subject: `Votre espace projet "${projectName}" est prêt`,
      html: ClientInvitationEmail({ projectName, agencyName, magicLink }),
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
