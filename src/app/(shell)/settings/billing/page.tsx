import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BillingPageClient } from '@/components/shell/BillingPageClient'

export default async function BillingPage() {
  const user = await requireRole(['ARCHITECT']).catch(() => null)
  if (!user) redirect('/login')

  const agency = await prisma.agency.findUnique({ where: { id: user.agencyId! } })
  if (!agency) redirect('/dashboard')

  return (
    <BillingPageClient
      currentPlan={agency.plan}
      hasStripeCustomer={!!agency.stripeCustomerId}
    />
  )
}
