import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await requireAdmin()
    if (!session) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const [
      totalArchitects,
      totalProjects,
      totalAOs,
      totalOffers,
      totalCompanies,
      waitlistPending,
      waitlistTotal,
      // Inscriptions par semaine (8 dernières semaines)
      recentUsers,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'ARCHITECT' } }),
      prisma.project.count(),
      prisma.aO.count(),
      prisma.offer.count({ where: { isComplete: true } }),
      prisma.user.count({ where: { role: 'COMPANY' } }),
      prisma.waitlistEntry.count({ where: { status: 'PENDING' } }),
      prisma.waitlistEntry.count(),
      // Architectes créés dans les 8 dernières semaines
      prisma.user.findMany({
        where: {
          role: 'ARCHITECT',
          createdAt: { gte: new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000) },
        },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    // Construire les données hebdomadaires
    const weeklyData: { week: string; count: number }[] = []
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - i * 7)
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)

      const count = recentUsers.filter(
        u => u.createdAt >= weekStart && u.createdAt < weekEnd
      ).length

      const label = weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      weeklyData.push({ week: label, count })
    }

    // Compteurs pour le funnel (waitlist + comptes activés = architectes + projets)
    const projectsWithDpgf = await prisma.project.count()
    const aoLaunched = await prisma.aO.count({ where: { status: { not: 'DRAFT' } } })

    // MRR estimé (plans Stripe)
    const studioUsers = await prisma.agency.count({ where: { plan: 'STUDIO' } })
    const agencyUsers = await prisma.agency.count({ where: { plan: 'AGENCY' } })
    const studioPriceCents = parseInt(process.env.STRIPE_STUDIO_PRICE_CENTS ?? '4900')
    const agencyPriceCents = parseInt(process.env.STRIPE_AGENCY_PRICE_CENTS ?? '9900')
    const mrr = Math.round((studioUsers * studioPriceCents + agencyUsers * agencyPriceCents) / 100)

    return NextResponse.json({
      totalArchitects,
      totalProjects,
      totalAOs,
      totalOffers,
      totalCompanies,
      waitlistPending,
      waitlistTotal,
      mrr,
      weeklySignups: weeklyData,
      funnel: {
        waitlistTotal,
        activatedAccounts: totalArchitects,
        projectCreated: projectsWithDpgf,
        aoLaunched,
      },
    })
  } catch (error) {
    console.error('[GET /api/admin/stats]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
