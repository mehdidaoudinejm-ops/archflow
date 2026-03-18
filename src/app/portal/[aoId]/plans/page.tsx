import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PlansPageClient } from '@/components/portal/PlansPageClient'

interface Props {
  params: { aoId: string }
  searchParams: { token?: string }
}

export default async function PortalPlansPage({ params, searchParams }: Props) {
  const token = searchParams.token ?? null
  if (!token) redirect('/login?error=lien_invalide')

  const aoCompanyRecord = await prisma.aOCompany.findFirst({
    where: { inviteToken: token, aoId: params.aoId },
    select: { id: true, companyUserId: true },
  })
  if (!aoCompanyRecord) redirect('/login?error=lien_invalide')

  const aoCompanyId = aoCompanyRecord.id
  const companyUserId = aoCompanyRecord.companyUserId

  const ao = await prisma.aO.findUnique({
    where: { id: params.aoId },
    select: { id: true, name: true, deadline: true },
  })

  if (!ao) redirect('/dashboard')

  const companyUser = await prisma.user.findUnique({
    where: { id: companyUserId },
    select: { firstName: true, lastName: true, agency: { select: { name: true } } },
  })

  const aoWithDpgf = await prisma.aO.findUnique({
    where: { id: params.aoId },
    select: { dpgfId: true },
  })

  const documents = await prisma.document.findMany({
    where: { dpgfId: aoWithDpgf?.dpgfId ?? '' },
    orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
    include: {
      reads: {
        where: { aoCompanyId: aoCompanyId },
        select: { readAt: true },
      },
    },
  })

  const companyName =
    companyUser?.agency?.name ??
    [companyUser?.firstName, companyUser?.lastName].filter(Boolean).join(' ') ??
    ''

  return (
    <PlansPageClient
      aoId={ao.id}
      aoName={ao.name}
      deadline={ao.deadline.toISOString()}
      companyName={companyName}
      aoCompanyId={aoCompanyId}
      initialDocs={documents.map((d) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        fileUrl: d.fileUrl,
        isMandatory: d.isMandatory,
        revision: d.revision,
        createdAt: d.createdAt.toISOString(),
        isRead: d.reads.length > 0,
        readAt: d.reads[0]?.readAt.toISOString() ?? null,
      }))}
    />
  )
}
