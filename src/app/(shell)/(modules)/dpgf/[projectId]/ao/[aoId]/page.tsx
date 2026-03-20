import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AOTracker } from '@/components/dpgf/AOTracker'
import { buildPortalUrl } from '@/lib/invite'

interface Props {
  params: { projectId: string; aoId: string }
}

export default async function AOTrackingPage({ params }: Props) {
  const user = await requireRole(['ARCHITECT', 'COLLABORATOR', 'ADMIN'])

  const ao = await prisma.aO.findUnique({
    where: { id: params.aoId },
    include: {
      dpgf: {
        include: {
          project: { select: { agencyId: true, name: true } },
          lots: { select: { id: true, number: true, name: true }, orderBy: { position: 'asc' } },
        },
      },
      aoCompanies: {
        include: {
          offer: { select: { id: true, submittedAt: true, isComplete: true } },
        },
        orderBy: { id: 'asc' },
      },
    },
  })

  if (!ao || ao.dpgf.project.agencyId !== user.agencyId) {
    redirect(`/dpgf/${params.projectId}`)
  }

  // Récupérer les infos des entreprises invitées
  const companyUserIds = ao.aoCompanies.map((c) => c.companyUserId)
  const companyUsers = await prisma.user.findMany({
    where: { id: { in: companyUserIds } },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      agency: { select: { name: true, siretVerified: true, dirigeantNom: true, dirigeantPrenoms: true } },
    },
  })

  const companyUsersMap = new Map(companyUsers.map((u) => [u.id, u]))

  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

  const companies = ao.aoCompanies.map((c) => {
    const u = companyUsersMap.get(c.companyUserId) ?? null
    const agency = u?.agency as ({ name: string; siretVerified?: boolean; dirigeantNom?: string | null; dirigeantPrenoms?: string | null } | null | undefined)
    let dirigeantNameMatch: boolean | null = null
    if (agency?.siretVerified && agency.dirigeantNom) {
      const sigLast = normalize(u?.lastName ?? '')
      const sigFirst = normalize(u?.firstName ?? '')
      const govLast = normalize(agency.dirigeantNom)
      const govFirst = normalize(agency.dirigeantPrenoms ?? '')
      if (govLast && sigLast) {
        const lastMatch = govLast === sigLast
        const firstMatch = !govFirst || !sigFirst || govFirst.includes(sigFirst) || sigFirst.includes(govFirst)
        dirigeantNameMatch = lastMatch && firstMatch
      }
    }
    return {
      id: c.id,
      status: c.status,
      paymentStatus: c.paymentStatus,
      tokenUsedAt: c.tokenUsedAt,
      portalUrl: c.inviteToken ? buildPortalUrl(params.aoId, c.inviteToken) : null,
      dirigeantNameMatch,
      offer: c.offer,
      companyUser: u,
    }
  })

  const lotsMap = new Map(ao.dpgf.lots.map((l) => [l.id, l]))
  const selectedLots = ao.lotIds
    .map((id) => lotsMap.get(id))
    .filter((l): l is NonNullable<typeof l> => l !== undefined)

  return (
    <AOTracker
      ao={{
        id: ao.id,
        name: ao.name,
        status: ao.status,
        deadline: ao.deadline.toISOString(),
        instructions: ao.instructions,
        allowCustomQty: ao.allowCustomQty,
        isPaid: ao.isPaid,
        paymentAmount: ao.paymentAmount,
        lotIds: ao.lotIds,
        requiredDocs: Array.isArray(ao.requiredDocs) ? ao.requiredDocs as { type: string; label: string; required: boolean }[] : null,
      }}
      projectId={params.projectId}
      projectName={ao.dpgf.project.name}
      selectedLots={selectedLots}
      companies={companies}
    />
  )
}
