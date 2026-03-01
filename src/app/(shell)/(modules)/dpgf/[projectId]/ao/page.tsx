import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AOWizard } from '@/components/dpgf/AOWizard'

interface Props {
  params: { projectId: string }
}

export default async function AOPage({ params }: Props) {
  const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: {
      dpgfs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          lots: {
            orderBy: { position: 'asc' },
            select: { id: true, number: true, name: true },
          },
        },
      },
    },
  })

  if (!project || project.agencyId !== user.agencyId) {
    redirect('/dashboard')
  }

  const dpgf = project.dpgfs[0]
  if (!dpgf) {
    redirect(`/dpgf/${params.projectId}`)
  }

  return (
    <AOWizard
      dpgfId={dpgf.id}
      projectId={params.projectId}
      projectName={project.name}
      lots={dpgf.lots}
    />
  )
}
