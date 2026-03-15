import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { ClientInvitationEmail } from '@/emails/ClientInvitationEmail'

export const dynamic = 'force-dynamic'

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

    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000'
    const proto = req.headers.get('x-forwarded-proto') ?? 'https'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${proto}://${host}`
    const redirectTo = `${appUrl}/client/${params.projectId}`

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Conflit : email déjà utilisé par un rôle non-CLIENT
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing && existing.role !== 'CLIENT') {
      const professionalRoles = ['ARCHITECT', 'COLLABORATOR', 'ADMIN']
      if (professionalRoles.includes(existing.role)) {
        // Vérifier si le compte Supabase Auth existe vraiment —
        // si non, c'est un zombie Prisma (Supabase delete a échoué + getUserWithProfile a recréé)
        const authRows = await prisma.$queryRaw<{ id: string }[]>`
          SELECT id::text FROM auth.users WHERE email = ${email} LIMIT 1
        `
        if (authRows.length > 0) {
          return NextResponse.json({ error: 'Cet email appartient déjà à un compte architecte ou admin actif' }, { status: 409 })
        }
        // Zombie Prisma sans compte Supabase → supprimer et continuer
      }
      // COMPANY, ou zombie ARCHITECT sans Supabase → supprimer pour re-créer en CLIENT
      await prisma.$transaction([
        prisma.projectPermission.deleteMany({ where: { userId: existing.id } }),
        prisma.notification.deleteMany({ where: { userId: existing.id } }),
        prisma.activityLog.deleteMany({ where: { userId: existing.id } }),
        prisma.user.delete({ where: { id: existing.id } }),
      ])
    }

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
