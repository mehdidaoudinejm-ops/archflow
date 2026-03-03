import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { verifyInviteToken } from '@/lib/invite'
import { QuestionsPageClient } from '@/components/portal/QuestionsPageClient'

interface Props {
  params: { aoId: string }
  searchParams: { token?: string }
}

export default async function PortalQuestionsPage({ params, searchParams }: Props) {
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

  // Q&A publics + ceux de cette entreprise
  const qas = await prisma.qA.findMany({
    where: {
      aoId: params.aoId,
      OR: [
        { visibility: 'PUBLIC' },
        { aoCompanyId: aoCompanyId! },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: { answer: true },
  })

  const companyName =
    companyUser?.agency?.name ??
    [companyUser?.firstName, companyUser?.lastName].filter(Boolean).join(' ') ??
    ''

  return (
    <QuestionsPageClient
      aoId={ao.id}
      aoName={ao.name}
      deadline={ao.deadline.toISOString()}
      companyName={companyName}
      aoCompanyId={aoCompanyId!}
      initialQas={qas.map((q) => ({
        id: q.id,
        title: q.title,
        body: q.body,
        visibility: q.visibility as 'PUBLIC' | 'PRIVATE',
        status: q.status as 'PENDING' | 'ANSWERED',
        postRef: q.postRef,
        createdAt: q.createdAt.toISOString(),
        isOwn: q.aoCompanyId === aoCompanyId,
        answer: q.answer ? { body: q.answer.body, createdAt: q.answer.createdAt.toISOString() } : null,
      }))}
    />
  )
}
