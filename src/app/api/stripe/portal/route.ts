import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireRole, AuthError } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(_req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  })
  try {
    const user = await requireRole(['ARCHITECT'])

    const agency = await prisma.agency.findUnique({ where: { id: user.agencyId! } })
    if (!agency?.stripeCustomerId) {
      return NextResponse.json({ error: 'Aucun abonnement actif' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await stripe.billingPortal.sessions.create({
      customer: agency.stripeCustomerId,
      return_url: `${appUrl}/settings/billing`,
    })

    return NextResponse.json({ url: session.url }, { status: 200 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[stripe/portal]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
