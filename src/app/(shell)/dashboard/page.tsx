import { redirect } from 'next/navigation'
import { getUserWithProfile } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardClient } from '@/components/shell/DashboardClient'
import { PROJECT_LIMITS } from '@/lib/project-limits'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getUserWithProfile()

  if (!user) redirect('/login')
  if (user.role === 'COMPANY') redirect('/mes-appels-doffres')
  if (user.role === 'ADMIN') redirect('/admin')

  if (!user.agencyId) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <p style={{ color: 'var(--text2)' }}>
          Votre compte n&apos;est pas encore associé à une agence.
        </p>
      </div>
    )
  }

  const [agency, allProjects, collaborators, permissions] = await Promise.all([
    prisma.agency.findUnique({
      where: { id: user.agencyId },
      select: { plan: true },
    }),
    prisma.project.findMany({
      where: { agencyId: user.agencyId },
      orderBy: { createdAt: 'desc' },
      include: {
        dpgfs: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            aos: {
              where: { status: { not: 'ARCHIVED' } },
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                _count: { select: { aoCompanies: true } },
                aoCompanies: {
                  where: { status: 'SUBMITTED' },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { agencyId: user.agencyId, role: 'COLLABORATOR' },
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
    prisma.projectPermission.findMany({
      where: {
        project: { agencyId: user.agencyId },
      },
      select: { projectId: true, userId: true },
    }),
  ])

  const plan = agency?.plan ?? 'SOLO'
  const projectLimit = PROJECT_LIMITS[plan] ?? 3

  const activeProjects = allProjects.filter((p) => p.status === 'ACTIVE')
  const archivedProjects = allProjects.filter((p) => p.status === 'ARCHIVED')

  // Permissions par projet : projectId → userId[]
  const permissionsByProject: Record<string, string[]> = {}
  for (const perm of permissions) {
    if (!permissionsByProject[perm.projectId]) permissionsByProject[perm.projectId] = []
    permissionsByProject[perm.projectId].push(perm.userId)
  }

  // Sérialisation (dates → strings)
  function serializeProject(p: typeof allProjects[0]) {
    return {
      id: p.id,
      name: p.name,
      address: p.address,
      status: p.status as 'ACTIVE' | 'ARCHIVED',
      createdAt: p.createdAt.toISOString(),
      dpgfs: p.dpgfs.map((d) => ({
        aos: d.aos.map((ao) => ({
          id: ao.id,
          status: ao.status,
          deadline: ao.deadline.toISOString(),
          _count: ao._count,
          aoCompanies: ao.aoCompanies,
          publishedElements: ao.publishedElements as Record<string, unknown> | null,
        })),
      })),
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <DashboardClient
        initialProjects={activeProjects.map(serializeProject)}
        initialArchivedProjects={archivedProjects.map(serializeProject)}
        plan={plan}
        activeCount={activeProjects.length}
        projectLimit={projectLimit}
        collaborators={collaborators}
        permissionsByProject={permissionsByProject}
        isArchitect={user.role === 'ARCHITECT'}
      />
    </div>
  )
}
