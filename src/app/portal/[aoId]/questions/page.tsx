import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { QuestionsPageClient } from '@/components/portal/QuestionsPageClient'

interface Props {
  params: { aoId: string }
  searchParams: { token?: string }
}

export default async function PortalQuestionsPage({ params, searchParams }: Props) {
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

  // Q&A publics + ceux de cette entreprise
  const qas = await prisma.qA.findMany({
    where: {
      aoId: params.aoId,
      OR: [
        { visibility: 'PUBLIC' },
        { aoCompanyId: aoCompanyId },
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
      aoCompanyId={aoCompanyId}
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
