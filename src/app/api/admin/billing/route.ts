import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await requireAdmin()
    if (!session) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    // Agences avec leur plan
    const agencies = await prisma.agency.findMany({
      include: {
        users: {
          where: { role: 'ARCHITECT' },
          select: { id: true, email: true, firstName: true, lastName: true, freeAccess: true, createdAt: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const studioPriceCents = parseInt(process.env.STRIPE_STUDIO_PRICE_CENTS ?? '4900')
    const agencyPriceCents = parseInt(process.env.STRIPE_AGENCY_PRICE_CENTS ?? '9900')

    let mrr = 0
    const subscriptions = agencies.map(agency => {
      const owner = agency.users[0]
      const isFree = owner?.freeAccess ?? false
      let amount = 0
      if (!isFree) {
        if (agency.plan === 'STUDIO') amount = studioPriceCents / 100
        else if (agency.plan === 'AGENCY') amount = agencyPriceCents / 100
      }
      mrr += amount
      return {
        agencyId: agency.id,
        agencyName: agency.name,
        plan: agency.plan,
        amount,
        freeAccess: isFree,
        stripeCustomerId: agency.stripeCustomerId,
        createdAt: agency.createdAt,
        ownerEmail: owner?.email ?? null,
        ownerId: owner?.id ?? null,
        ownerName: owner ? `${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim() : null,
      }
    })

    return NextResponse.json({ mrr, subscriptions })
  } catch (error) {
    console.error('[GET /api/admin/billing]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
