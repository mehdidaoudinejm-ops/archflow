import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DCEPageClient } from '@/components/dpgf/DCEPageClient'

interface Props {
  params: { projectId: string }
}

export default async function DCEPage({ params }: Props) {
  const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    select: { id: true, name: true, agencyId: true },
  })

  if (!project || project.agencyId !== user.agencyId) redirect('/dashboard')

  // Trouver le DPGF (le premier non archivé)
  const dpgf = await prisma.dPGF.findFirst({
    where: { projectId: params.projectId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true },
  })

  if (!dpgf) redirect(`/dpgf/${params.projectId}`)

  // AO le plus récent (optionnel — pour le suivi lecture)
  const ao = await prisma.aO.findFirst({
    where: {
      dpgf: { projectId: params.projectId },
      status: { not: 'ARCHIVED' },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, status: true },
  })

  const documents = await prisma.document.findMany({
    where: { dpgfId: dpgf.id },
    orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
    include: { reads: { select: { aoCompanyId: true } } },
  })

  // Nombre d'entreprises invitées (pour les compteurs de lecture)
  const companiesCount = ao
    ? await prisma.aOCompany.count({ where: { aoId: ao.id } })
    : 0

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
