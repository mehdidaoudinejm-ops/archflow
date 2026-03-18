import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SettingsClient } from './SettingsClient'
import { AuthError } from '@/lib/auth'

export default async function SettingsPage() {
  let user
  try {
    user = await requireRole(['ARCHITECT', 'COLLABORATOR', 'COMPANY'])
  } catch (error) {
    if (error instanceof AuthError) redirect('/login')
    throw error
  }

  const agency = user.agencyId
    ? await prisma.agency.findUnique({ where: { id: user.agencyId } })
    : null

  return (
    <SettingsClient
      user={{
        id: user.id,
        email: user.email,
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        role: user.role,
      }}
      agency={agency ? {
        id: agency.id,
        name: agency.name,
        siret: (agency as { siret?: string | null }).siret ?? null,
        siretVerified: (agency as { siretVerified?: boolean }).siretVerified ?? false,
        legalForm: (agency as { legalForm?: string | null }).legalForm ?? null,
        companyAddress: (agency as { companyAddress?: string | null }).companyAddress ?? null,
        postalCode: (agency as { postalCode?: string | null }).postalCode ?? null,
        city: (agency as { city?: string | null }).city ?? null,
        country: (agency as { country?: string | null }).country ?? null,
        phone: (agency as { phone?: string | null }).phone ?? null,
        trade: (agency as { trade?: string | null }).trade ?? null,
        signatoryQuality: (agency as { signatoryQuality?: string | null }).signatoryQuality ?? null,
        logoUrl: agency.logoUrl ?? null,
        plan: agency.plan,
        activeModules: agency.activeModules,
      } : null}
    />
  )
}
