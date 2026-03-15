import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DCEPageClient } from '@/components/dpgf/DCEPageClient'

interface Props {
  params: { projectId: string }
}

export default async function DCEPage({ params }: Props) {
  const user = await requireRole(['ARCHITECT', 'COLLABORATOR', 'ADMIN'])

  // Round-trip 2 : project + dpgf + ao en parallèle (tous utilisent params.projectId)
  const [project, dpgf, ao] = await Promise.all([
    prisma.project.findUnique({
      where: { id: params.projectId },
      select: { id: true, name: true, agencyId: true },
    }),
    prisma.dPGF.findFirst({
      where: { projectId: params.projectId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true },
    }),
    prisma.aO.findFirst({
      where: {
        dpgf: { projectId: params.projectId },
        status: { not: 'ARCHIVED' },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, status: true },
    }),
  ])

  if (!project || project.agencyId !== user.agencyId) redirect('/dashboard')
  if (!dpgf) redirect(`/dpgf/${params.projectId}`)

  // Round-trip 3 : documents + companiesCount en parallèle
  const [documents, companiesCount] = await Promise.all([
    prisma.document.findMany({
      where: { dpgfId: dpgf.id },
      orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
      include: { reads: { select: { aoCompanyId: true } } },
    }),
    ao ? prisma.aOCompany.count({ where: { aoId: ao.id } }) : Promise.resolve(0),
  ])

  return (
    <DCEPageClient
      projectId={params.projectId}
      projectName={project.name}
      dpgfId={dpgf.id}
      dpgfStatus={dpgf.status}
      ao={ao ? { id: ao.id, name: ao.name, status: ao.status } : null}
      initialDocs={documents.map((d) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        fileUrl: d.fileUrl,
        isMandatory: d.isMandatory,
        revision: d.revision,
        createdAt: d.createdAt.toISOString(),
        readCount: d.reads.length,
        companiesCount,
      }))}
    />
  )
}
