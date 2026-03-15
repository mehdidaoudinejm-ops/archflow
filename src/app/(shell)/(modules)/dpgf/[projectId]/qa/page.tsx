import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { QAPageClient } from '@/components/dpgf/QAPageClient'

interface Props {
  params: { projectId: string }
}

export default async function QAPage({ params }: Props) {
  const user = await requireRole(['ARCHITECT', 'COLLABORATOR', 'ADMIN'])

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    select: { id: true, name: true, agencyId: true },
  })

  if (!project || project.agencyId !== user.agencyId) redirect('/dashboard')

  const ao = await prisma.aO.findFirst({
    where: {
      dpgf: { projectId: params.projectId },
      status: { not: 'ARCHIVED' },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true },
  })

  if (!ao) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <p className="text-base font-medium" style={{ color: 'var(--text)' }}>
          Aucun appel d&apos;offre pour ce projet
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--text2)' }}>
          Les questions apparaîtront ici dès que les entreprises auront accès au portail.
        </p>
      </div>
    )
  }

  const qas = await prisma.qA.findMany({
    where: { aoId: ao.id },
    orderBy: { createdAt: 'desc' },
    include: {
      answer: true,
      aoCompany: { select: { companyUserId: true } },
    },
  })

  // Récupérer les utilisateurs entreprises séparément
  const companyUserIds = Array.from(new Set(qas.map((q) => q.aoCompany.companyUserId)))
  const companyUsers = await prisma.user.findMany({
    where: { id: { in: companyUserIds } },
    select: { id: true, firstName: true, lastName: true, agency: { select: { name: true } } },
  })
  const companyUserMap = new Map(companyUsers.map((u) => [u.id, u]))

  return (
    <QAPageClient
      projectId={params.projectId}
      projectName={project.name}
      ao={{ id: ao.id, name: ao.name }}
      initialQas={qas.map((q) => {
        const companyUser = companyUserMap.get(q.aoCompany.companyUserId)
        const companyName =
          companyUser?.agency?.name ??
          [companyUser?.firstName, companyUser?.lastName].filter(Boolean).join(' ') ??
          'Entreprise'
        return {
          id: q.id,
          title: q.title,
          body: q.body,
          visibility: q.visibility as 'PUBLIC' | 'PRIVATE',
          status: q.status as 'PENDING' | 'ANSWERED',
          postRef: q.postRef,
          createdAt: q.createdAt.toISOString(),
          companyName,
          answer: q.answer ? { body: q.answer.body, createdAt: q.answer.createdAt.toISOString() } : null,
        }
      })}
    />
  )
}
