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

  // Trouver l'AO le plus récent (non archivé)
  const ao = await prisma.aO.findFirst({
    where: {
      dpgf: { projectId: params.projectId },
      status: { not: 'ARCHIVED' },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, status: true, deadline: true },
  })

  if (!ao) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <p className="text-base font-medium" style={{ color: 'var(--text)' }}>
          Aucun appel d&apos;offre pour ce projet
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--text2)' }}>
          Créez un AO depuis la page DPGF pour pouvoir déposer des documents.
        </p>
      </div>
    )
  }

  const documents = await prisma.document.findMany({
    where: { aoId: ao.id },
    orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
    include: { reads: { select: { aoCompanyId: true } } },
  })

  // Nombre d'entreprises invitées (pour les compteurs de lecture)
  const companiesCount = await prisma.aOCompany.count({ where: { aoId: ao.id } })

  return (
    <DCEPageClient
      projectId={params.projectId}
      projectName={project.name}
      ao={{ id: ao.id, name: ao.name, status: ao.status }}
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
