import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  let totalUsers = 0, totalAgencies = 0, totalProjects = 0, pendingWaitlist = 0
  let roleBreakdown: { role: string; _count: { _all: number } }[] = []
  let recentUsers: { email: string; firstName: string | null; lastName: string | null; role: string; createdAt: Date; agency: { name: string } | null }[] = []
  let dbError = false

  try {
    ;[totalUsers, totalAgencies, totalProjects, pendingWaitlist, roleBreakdown, recentUsers] =
      await Promise.all([
        prisma.user.count(),
        prisma.agency.count(),
        prisma.project.count(),
        prisma.waitlistEntry.count({ where: { status: 'PENDING' } }),
        prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
        prisma.user.findMany({
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: {
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            createdAt: true,
            agency: { select: { name: true } },
          },
        }),
      ])
  } catch (err) {
    console.error('[AdminDashboard] Prisma error:', err)
    dbError = true
  }

  const stats = [
    { label: 'Utilisateurs', value: totalUsers },
    { label: 'Agences', value: totalAgencies },
    { label: 'Projets', value: totalProjects },
    { label: 'Waitlist en attente', value: pendingWaitlist, accent: true },
  ]

  const roleColors: Record<string, string> = {
    ARCHITECT: 'bg-blue-500/10 text-blue-400',
    COLLABORATOR: 'bg-purple-500/10 text-purple-400',
    COMPANY: 'bg-amber-500/10 text-amber-400',
    CLIENT: 'bg-green-500/10 text-green-400',
    ADMIN: 'bg-red-500/10 text-red-400',
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-zinc-100 mb-8">Dashboard</h1>

      {dbError && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          Impossible de charger les données — vérifiez la connexion à la base de données.
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map(({ label, value, accent }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div
              className={`text-4xl font-bold mb-1 ${accent ? 'text-red-400' : 'text-zinc-100'}`}
            >
              {value}
            </div>
            <div className="text-zinc-500 text-sm">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role breakdown */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-base font-semibold text-zinc-200 mb-4">Répartition par rôle</h2>
          <div className="space-y-3">
            {roleBreakdown.map(({ role, _count }) => (
              <div key={role} className="flex items-center justify-between">
                <span
                  className={`text-xs px-2 py-0.5 rounded font-medium ${roleColors[role] ?? 'bg-zinc-700 text-zinc-300'}`}
                >
                  {role}
                </span>
                <span className="text-zinc-300 font-mono text-sm">{_count._all}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent registrations */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-base font-semibold text-zinc-200 mb-4">Dernières inscriptions</h2>
          <div className="space-y-3">
            {recentUsers.map((user) => (
              <div key={user.email} className="flex items-center justify-between text-sm">
                <div>
                  <div className="text-zinc-200">{user.email}</div>
                  {user.agency && (
                    <div className="text-zinc-500 text-xs">{user.agency.name}</div>
                  )}
                </div>
                <div className="text-zinc-600 text-xs">
                  {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
