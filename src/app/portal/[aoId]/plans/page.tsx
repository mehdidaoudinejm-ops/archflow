import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { verifyInviteToken } from '@/lib/invite'
import { PlansPageClient } from '@/components/portal/PlansPageClient'

interface Props {
  params: { aoId: string }
  searchParams: { token?: string }
}

export default async function PortalPlansPage({ params, searchParams }: Props) {
  const token = searchParams.token ?? null
  let aoCompanyId: string | null = null
  let companyUserId: string | null = null

  if (token) {
    try {
      const payload = await verifyInviteToken(token)
      if (payload.aoId === params.aoId) {
        const aoCompany = await prisma.aOCompany.findUnique({
          where: { id: payload.aoCompanyId },
          select: { id: true, aoId: true, companyUserId: true },
        })
        if (aoCompany && aoCompany.aoId === params.aoId) {
          aoCompanyId = aoCompany.id
          companyUserId = aoCompany.companyUserId
        }
      }
    } catch {
      // Token invalide
    }
  }

  if (!aoCompanyId) {
    const session = await getSession()
    if (!session) redirect(`/login`)

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } })
    if (!user || user.role !== 'COMPANY') redirect('/login')

    const aoCompany = await prisma.aOCompany.findFirst({
      where: { companyUserId: user.id, aoId: params.aoId },
      select: { id: true, companyUserId: true },
    })
    if (!aoCompany) redirect('/dashboard')

    aoCompanyId = aoCompany.id
    companyUserId = aoCompany.companyUserId
  }

  const ao = await prisma.aO.findUnique({
    where: { id: params.aoId },
    select: { id: true, name: true, deadline: true },
  })

  if (!ao) redirect('/dashboard')

  const companyUser = await prisma.user.findUnique({
    where: { id: companyUserId! },
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
        where: { aoCompanyId: aoCompanyId! },
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
      aoCompanyId={aoCompanyId!}
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
