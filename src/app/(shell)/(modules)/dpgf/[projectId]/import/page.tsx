import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ImportReviewClient } from '@/components/dpgf/ImportReviewClient'

interface Props {
  params: { projectId: string }
  searchParams: { importId?: string }
}

export default async function ImportPage({ params, searchParams }: Props) {
  const user = await requireRole(['ARCHITECT', 'COLLABORATOR']).catch(() => null)
  if (!user) redirect('/login')

  const importId = searchParams.importId
  if (!importId) redirect(`/dpgf/${params.projectId}`)

  const aiImport = await prisma.aIImport.findFirst({
    where: {
      id: importId,
      dpgf: { project: { agencyId: user.agencyId! } },
    },
    include: {
      dpgf: {
        include: { project: { select: { name: true } } },
      },
    },
  })

  if (!aiImport || aiImport.status === 'FAILED') {
    redirect(`/dpgf/${params.projectId}`)
  }

  return (
    <ImportReviewClient
      importId={importId}
      dpgfId={aiImport.dpgfId}
      projectId={params.projectId}
      projectName={aiImport.dpgf.project.name}
      rawResponse={aiImport.rawResponse as object}
      globalConfidence={(aiImport.confidenceScores as { global?: number } | null)?.global ?? 0}
    />
  )
}
