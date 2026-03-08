import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { ReminderEmail } from '@/emails/ReminderEmail'

export const dynamic = 'force-dynamic'

export const runtime = 'nodejs'

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export async function GET(req: Request) {
  // Vérification sécurité : seul Vercel Cron peut appeler cette route
  const authHeader = req.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const today = new Date()
  const in7days = addDays(today, 7)
  const in3days = addDays(today, 3)

  // Chercher les AO en cours dont la deadline est dans 7 ou 3 jours
  const aos = await prisma.aO.findMany({
    where: {
      status: 'IN_PROGRESS',
      deadline: {
        gte: addDays(today, 2),
        lte: addDays(today, 8),
      },
    },
    include: {
      dpgf: {
        include: {
          project: { select: { name: true } },
        },
      },
      aoCompanies: {
        where: {
          status: { notIn: ['SUBMITTED'] },
        },
        include: {
          offer: { select: { isComplete: true } },
        },
      },
    },
  })

  let sent = 0

  for (const ao of aos) {
    const daysLeft = isSameDay(ao.deadline, in7days)
      ? 7
      : isSameDay(ao.deadline, in3days)
      ? 3
      : null

    if (daysLeft === null) continue

    for (const aoCompany of ao.aoCompanies) {
      // Ignorer si l'offre est déjà complète
      if (aoCompany.offer?.isComplete) continue

      // Récupérer l'email de l'entreprise via companyUserId
      const companyUser = await prisma.user.findUnique({
        where: { id: aoCompany.companyUserId },
        select: {
          email: true,
          firstName: true,
          lastName: true,
          agencyId: true,
        },
      })

      if (!companyUser) continue

      // Récupérer le nom de l'agence si disponible
      let companyName = `${companyUser.firstName ?? ''} ${companyUser.lastName ?? ''}`.trim()
      if (companyUser.agencyId) {
        const agency = await prisma.agency.findUnique({
          where: { id: companyUser.agencyId },
          select: { name: true },
        })
        if (agency) companyName = agency.name
      }
      if (!companyName) companyName = companyUser.email

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      const portalUrl = `${appUrl}/portal/${ao.id}`
      const deadline = ao.deadline.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })

      try {
        await sendEmail({
          to: companyUser.email,
          subject: `Rappel — Plus que ${daysLeft} jour${daysLeft > 1 ? 's' : ''} pour soumettre votre offre`,
          html: ReminderEmail({
            companyName,
            aoName: ao.name,
            projectName: ao.dpgf.project.name,
            deadline,
            daysLeft,
            portalUrl,
          }),
        })
        sent++
      } catch (err) {
        console.error(`[jobs/reminders] Erreur envoi à ${companyUser.email}:`, err)
      }
    }
  }

  return NextResponse.json({ sent }, { status: 200 })
}
