import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canSeeEstimate } from '@/lib/dpgf-permissions'
import { DPGFPageClient } from '@/components/dpgf/DPGFPageClient'
import type { DPGFWithLots } from '@/types'

interface Props {
  params: { projectId: string }
}

export default async function DPGFPage({ params }: Props) {
  const user = await requireRole(['ARCHITECT', 'COLLABORATOR', 'ADMIN'])

  // Fetch project + dpgfId
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

  // Create DPGF if project has none
  let dpgfId = project.dpgfs[0]?.id
  if (!dpgfId) {
    const created = await prisma.dPGF.create({
      data: { projectId: project.id, createdById: user.id, status: 'DRAFT' },
      select: { id: true },
    })
    dpgfId = created.id
  }

  // Fetch AO + full DPGF structure + permissions in parallel
  const [activeAo, dpgfRaw, seeEstimate] = await Promise.all([
    prisma.aO.findFirst({
      where: { dpgfId, status: { notIn: ['ARCHIVED'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true },
    }),
    prisma.dPGF.findUnique({
      where: { id: dpgfId },
      include: {
        lots: {
          orderBy: { position: 'asc' },
          include: {
            sublots: {
              orderBy: { position: 'asc' },
              include: { posts: { orderBy: { position: 'asc' } } },
            },
            posts: {
              where: { sublotId: null },
              orderBy: { position: 'asc' },
            },
          },
        },
      },
    }),
    canSeeEstimate(project.id, user.id, user.role),
  ])

  // Sanitize estimate data for users without permission
  const initialDpgf = dpgfRaw
    ? seeEstimate
      ? (dpgfRaw as unknown as DPGFWithLots)
      : ({
          ...dpgfRaw,
          lots: dpgfRaw.lots.map((lot) => ({
            ...lot,
            sublots: lot.sublots.map((sl) => ({
              ...sl,
              posts: sl.posts.map((p) => ({ ...p, unitPriceArchi: null })),
            })),
            posts: lot.posts.map((p) => ({ ...p, unitPriceArchi: null })),
          })),
        } as unknown as DPGFWithLots)
    : null

  return (
    <DPGFPageClient
      dpgfId={dpgfId}
      projectId={params.projectId}
      projectName={project.name}
      initialAo={activeAo ? { id: activeAo.id, status: activeAo.status } : null}
      initialDpgf={initialDpgf}
    />
  )
}
