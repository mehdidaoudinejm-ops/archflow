import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import type { Plan } from '@prisma/client'

export const dynamic = 'force-dynamic'

export const runtime = 'nodejs'

// Mapper les product metadata vers les plans ArchFlow
function planFromPriceId(priceId: string): Plan {
  if (priceId.includes('studio')) return 'STUDIO'
  if (priceId.includes('agency')) return 'AGENCY'
  return 'SOLO'
}

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  })

  const body = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET ?? '')
  } catch (err) {
    console.error('[webhook/stripe] Signature invalide:', err)
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string
        const priceId = sub.items.data[0]?.price.id ?? ''
        const newPlan = planFromPriceId(priceId)

        await prisma.agency.updateMany({
          where: { stripeCustomerId: customerId },
          data: { plan: newPlan },
        })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string

        await prisma.agency.updateMany({
          where: { stripeCustomerId: customerId },
          data: { plan: 'SOLO' },
        })
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`[webhook/stripe] Paiement reçu — invoice ${invoice.id}`)
        break
      }

      default:
        // Ignorer les autres événements
        break
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    console.error('[webhook/stripe] Traitement erreur:', err)
    return NextResponse.json({ error: 'Erreur traitement webhook' }, { status: 500 })
  }
}
