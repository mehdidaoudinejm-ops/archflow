import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PortalEntrepriseClient } from '@/components/portal/PortalEntrepriseClient'

interface Props {
  params: { aoId: string }
  searchParams: { token?: string }
}

export default async function PortalEntreprisePage({ params, searchParams }: Props) {
  const token = searchParams.token ?? null
  if (!token) redirect('/login?error=lien_invalide')

  const aoCompanyRecord = await prisma.aOCompany.findFirst({
    where: { inviteToken: token, aoId: params.aoId },
    select: { id: true, companyUserId: true },
  })
  if (!aoCompanyRecord) redirect('/login?error=lien_invalide')

  const companyUserId = aoCompanyRecord.companyUserId

  const ao = await prisma.aO.findUnique({
    where: { id: params.aoId },
    select: { id: true, name: true, deadline: true },
  })
  if (!ao) redirect('/login?error=lien_invalide')

  const companyUser = await prisma.user.findUnique({
    where: { id: companyUserId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      agencyId: true,
      agency: {
        select: {
          id: true,
          name: true,
          siret: true,
          siretVerified: true,
          legalForm: true,
          legalFormDeclared: true,
          companyAddress: true,
          postalCode: true,
          city: true,
          country: true,
          phone: true,
          trade: true,
          signatoryQuality: true,
          logoUrl: true,
        },
      },
    },
  })

  if (!companyUser) redirect('/login?error=lien_invalide')

  const agency = companyUser.agency

  return (
    <PortalEntrepriseClient
      aoId={ao.id}
      aoName={ao.name}
      deadline={ao.deadline.toISOString()}
      token={token}
      user={{
        id: companyUser.id,
        email: companyUser.email,
        firstName: companyUser.firstName,
        lastName: companyUser.lastName,
      }}
      agency={agency ? {
        id: agency.id,
        name: agency.name,
        siret: (agency as { siret?: string | null }).siret ?? null,
        siretVerified: (agency as { siretVerified?: boolean }).siretVerified ?? false,
        legalForm: (agency as { legalForm?: string | null }).legalForm ?? null,
        legalFormDeclared: (agency as { legalFormDeclared?: string | null }).legalFormDeclared ?? null,
        companyAddress: (agency as { companyAddress?: string | null }).companyAddress ?? null,
        postalCode: (agency as { postalCode?: string | null }).postalCode ?? null,
        city: (agency as { city?: string | null }).city ?? null,
        country: (agency as { country?: string | null }).country ?? null,
        phone: (agency as { phone?: string | null }).phone ?? null,
        trade: (agency as { trade?: string | null }).trade ?? null,
        signatoryQuality: (agency as { signatoryQuality?: string | null }).signatoryQuality ?? null,
        logoUrl: agency.logoUrl ?? null,
      } : null}
    />
  )
}
