import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DPGFPageClient } from '@/components/dpgf/DPGFPageClient'

interface Props {
  params: { projectId: string }
}

export default async function DPGFPage({ params }: Props) {
  const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: {
      dpgfs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true },
      },
    },
  })

  if (!project || project.agencyId !== user.agencyId) {
    redirect('/dashboard')
  }

  // Créer une DPGF si le projet n'en a pas encore
  let dpgfId = project.dpgfs[0]?.id
  if (!dpgfId) {
    const created = await prisma.dPGF.create({
      data: { projectId: project.id, createdById: user.id, status: 'DRAFT' },
      select: { id: true },
    })
    dpgfId = created.id
  }

  // Récupérer l'AO actif (hors ARCHIVED)
  const activeAo = await prisma.aO.findFirst({
    where: { dpgfId, status: { notIn: ['ARCHIVED'] } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true },
  })

  return (
    <DPGFPageClient
      dpgfId={dpgfId}
      projectId={params.projectId}
      projectName={project.name}
      initialAo={activeAo ? { id: activeAo.id, status: activeAo.status } : null}
    />
  )
}
