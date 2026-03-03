import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireRole, AuthError } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  })
  try {
    const user = await requireRole(['ARCHITECT'])

    const { priceId } = (await req.json()) as { priceId: string }
    if (!priceId) {
      return NextResponse.json({ error: 'priceId manquant' }, { status: 400 })
    }

    const agency = await prisma.agency.findUnique({ where: { id: user.agencyId! } })
    if (!agency) {
      return NextResponse.json({ error: 'Agence introuvable' }, { status: 404 })
    }

    // Créer ou récupérer le customer Stripe
    let customerId = agency.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: agency.name,
        metadata: { agencyId: agency.id },
      })
      customerId = customer.id
      await prisma.agency.update({
        where: { id: agency.id },
        data: { stripeCustomerId: customerId },
      })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings/billing?success=1`,
      cancel_url: `${appUrl}/settings/billing?canceled=1`,
    })

    return NextResponse.json({ url: session.url }, { status: 200 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[stripe/checkout]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
