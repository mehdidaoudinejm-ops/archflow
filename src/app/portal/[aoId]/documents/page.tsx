import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DocumentsPageClient } from '@/components/portal/DocumentsPageClient'

interface Props {
  params: { aoId: string }
  searchParams: { token?: string }
}

export default async function PortalDocumentsPage({ params, searchParams }: Props) {
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

  const adminDocs = await prisma.adminDoc.findMany({
    where: { aoCompanyId: aoCompanyId },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      type: true,
      fileUrl: true,
      status: true,
      rejectionReason: true,
    },
  })

  const companyName =
    companyUser?.agency?.name ??
    [companyUser?.firstName, companyUser?.lastName].filter(Boolean).join(' ') ??
    ''

  return (
    <DocumentsPageClient
      aoId={ao.id}
      aoName={ao.name}
      deadline={ao.deadline.toISOString()}
      companyName={companyName}
      initialDocs={adminDocs.map((d) => ({
        id: d.id,
        type: d.type,
        fileUrl: d.fileUrl,
        status: d.status as 'PENDING' | 'VALID' | 'EXPIRED' | 'REJECTED',
        rejectionReason: d.rejectionReason,
      }))}
    />
  )
}
