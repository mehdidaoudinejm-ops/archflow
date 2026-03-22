import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BillingPageClient } from '@/components/shell/BillingPageClient'
import { getPlanLimits } from '@/lib/project-limits'

export default async function BillingPage() {
  const user = await requireRole(['ARCHITECT']).catch(() => null)
  if (!user) redirect('/login')

  const [agency, planLimits] = await Promise.all([
    prisma.agency.findUnique({ where: { id: user.agencyId! } }),
    getPlanLimits(),
  ])
  if (!agency) redirect('/dashboard')

  return (
    <BillingPageClient
      currentPlan={agency.plan}
      hasStripeCustomer={!!agency.stripeCustomerId}
      planConfigs={planLimits}
    />
  )
}
