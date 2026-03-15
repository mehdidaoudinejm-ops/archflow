import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AOTracker } from '@/components/dpgf/AOTracker'

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
      agency: { select: { name: true } },
    },
  })

  const companyUsersMap = new Map(companyUsers.map((u) => [u.id, u]))

  const companies = ao.aoCompanies.map((c) => ({
    id: c.id,
    status: c.status,
    paymentStatus: c.paymentStatus,
    tokenUsedAt: c.tokenUsedAt,
    offer: c.offer,
    companyUser: companyUsersMap.get(c.companyUserId) ?? null,
  }))

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
