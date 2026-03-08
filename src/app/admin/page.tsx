import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { WeeklySignupsChart } from '@/components/shell/WeeklySignupsChart'

export const dynamic = 'force-dynamic'

const MRR_BY_PLAN: Record<string, number> = {
  SOLO: 0,
  STUDIO: 49,
  AGENCY: 99,
}

const roleColors: Record<string, string> = {
  ARCHITECT: 'bg-blue-500/10 text-blue-400',
  COLLABORATOR: 'bg-purple-500/10 text-purple-400',
  COMPANY: 'bg-amber-500/10 text-amber-400',
  CLIENT: 'bg-green-500/10 text-green-400',
  ADMIN: 'bg-red-500/10 text-red-400',
}

const planColors: Record<string, string> = {
  SOLO: 'bg-zinc-700/50 text-zinc-300',
  STUDIO: 'bg-blue-500/10 text-blue-400',
  AGENCY: 'bg-purple-500/10 text-purple-400',
}

export default async function AdminDashboardPage() {
  let dbError = false

  let totalUsers = 0
  let suspendedUsers = 0
  let freeAccessUsers = 0
  let newUsersLast7Days = 0
  let totalAgencies = 0
  let totalProjects = 0
  let roleBreakdown: { role: string; _count: { _all: number } }[] = []
  let agenciesByPlan: { plan: string; _count: { _all: number } }[] = []
  let waitlistByStatus: { status: string; _count: { _all: number } }[] = []
  let recentUsers: {
    email: string
    firstName: string | null
    lastName: string | null
    role: string
    suspended: boolean
    createdAt: Date
    agency: { name: string } | null
  }[] = []
  let weeklySignups: { label: string; users: number }[] = []
  let funnelWaitlist = 0
  let funnelInscrits = 0
  let funnelProjet = 0
  let funnelAO = 0

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const eightWeeksAgo = new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000)
    ;[
      totalUsers,
      suspendedUsers,
      freeAccessUsers,
      newUsersLast7Days,
      totalAgencies,
      totalProjects,
      roleBreakdown,
      agenciesByPlan,
      waitlistByStatus,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { suspended: true } }),
      prisma.user.count({ where: { freeAccess: true } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.agency.count(),
      prisma.project.count(),
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.agency.groupBy({ by: ['plan'], _count: { _all: true } }),
      prisma.waitlistEntry.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          suspended: true,
          createdAt: true,
          agency: { select: { name: true } },
        },
      }),
    ])

    // Inscriptions par semaine (8 dernières semaines)
    const recentSignups = await prisma.user.findMany({
      where: { createdAt: { gte: eightWeeksAgo } },
      select: { createdAt: true },
    })
    const weekBuckets = Array.from({ length: 8 }, (_, i) => {
      const weekStart = new Date(eightWeeksAgo.getTime() + i * 7 * 24 * 60 * 60 * 1000)
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      const label = weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      const users = recentSignups.filter(
        (u) => u.createdAt >= weekStart && u.createdAt < weekEnd
      ).length
      return { label, users }
    })
    weeklySignups = weekBuckets

    // Funnel
    const [waitlistTotal, agenciesWithProject, agenciesWithAO] = await Promise.all([
      prisma.waitlistEntry.count(),
      prisma.agency.count({ where: { projects: { some: {} } } }),
      prisma.agency.count({
        where: { projects: { some: { dpgfs: { some: { aos: { some: {} } } } } } },
      }),
    ])
    funnelWaitlist = waitlistTotal
    funnelInscrits = totalUsers
    funnelProjet = agenciesWithProject
    funnelAO = agenciesWithAO

  } catch (err) {
    console.error('[AdminDashboard] Prisma error:', err)
    dbError = true
  }

  const waitlistMap = Object.fromEntries(
    waitlistByStatus.map((w) => [w.status, w._count._all])
  )

  const mrr = agenciesByPlan.reduce((sum, { plan, _count }) => {
    return sum + (_count._all * (MRR_BY_PLAN[plan] ?? 0))
  }, 0)

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-100">Dashboard</h1>
        <span className="text-xs text-zinc-600">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>

      {dbError && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          Impossible de charger les données — vérifiez la connexion à la base de données.
        </div>
      )}

      {/* Ligne 1 — Utilisateurs */}
      <section>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Utilisateurs</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Total" value={totalUsers} />
          <KpiCard label="Nouveaux (7j)" value={newUsersLast7Days} accent="blue" />
          <KpiCard label="Suspendus" value={suspendedUsers} accent={suspendedUsers > 0 ? 'red' : undefined} />
          <KpiCard label="Accès gratuit" value={freeAccessUsers} accent="green" />
        </div>
      </section>

      {/* Ligne 2 — Plateforme */}
      <section>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Plateforme</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Agences" value={totalAgencies} />
          <KpiCard label="Projets" value={totalProjects} />
          <KpiCard label="Waitlist — en attente" value={waitlistMap['PENDING'] ?? 0} accent={waitlistMap['PENDING'] > 0 ? 'amber' : undefined} />
          <KpiCard label="MRR estimé" value={mrr} suffix="€" accent="green" />
        </div>
      </section>

      {/* Ligne 3 — Détail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Répartition rôles */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">Rôles</p>
          <div className="space-y-2.5">
            {roleBreakdown.map(({ role, _count }) => (
              <div key={role} className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${roleColors[role] ?? 'bg-zinc-700 text-zinc-300'}`}>
                  {role}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zinc-500 rounded-full"
                      style={{ width: `${Math.round((_count._all / Math.max(totalUsers, 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-zinc-300 font-mono text-sm w-6 text-right">{_count._all}</span>
                </div>
              </div>
            ))}
            {roleBreakdown.length === 0 && <p className="text-zinc-600 text-sm">Aucun utilisateur</p>}
          </div>
        </div>

        {/* Agences par plan */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">Plans</p>
          <div className="space-y-2.5">
            {agenciesByPlan.map(({ plan, _count }) => (
              <div key={plan} className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${planColors[plan] ?? 'bg-zinc-700 text-zinc-300'}`}>
                  {plan}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zinc-500 rounded-full"
                      style={{ width: `${Math.round((_count._all / Math.max(totalAgencies, 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-zinc-300 font-mono text-sm w-6 text-right">{_count._all}</span>
                </div>
              </div>
            ))}
            {agenciesByPlan.length === 0 && <p className="text-zinc-600 text-sm">Aucune agence</p>}
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-3 gap-2 text-center">
            {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
              <div key={s}>
                <div className="text-lg font-bold text-zinc-200">{waitlistMap[s] ?? 0}</div>
                <div className="text-xs text-zinc-600">
                  {s === 'PENDING' ? 'attente' : s === 'APPROVED' ? 'approuvés' : 'refusés'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inscriptions récentes */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Récents</p>
            <Link href="/admin/users" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Voir tous →
            </Link>
          </div>
          <div className="space-y-2.5">
            {recentUsers.map((user) => (
              <div key={user.email} className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                  style={{ background: '#27272a', color: '#a1a1aa' }}
                >
                  {(user.firstName?.[0] ?? user.email[0]).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-zinc-200 text-xs truncate">{user.email}</div>
                  <div className="text-zinc-600 text-xs">{user.agency?.name ?? user.role}</div>
                </div>
                {user.suspended && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 shrink-0">sus.</span>
                )}
              </div>
            ))}
            {recentUsers.length === 0 && <p className="text-zinc-600 text-sm">Aucun utilisateur</p>}
          </div>
        </div>

      </div>

      {/* Ligne 4 — Graphique + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Inscriptions par semaine */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">
            Inscriptions — 8 dernières semaines
          </p>
          <WeeklySignupsChart data={weeklySignups} />
        </div>

        {/* Funnel de conversion */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">
            Funnel de conversion
          </p>
          <div className="space-y-3">
            {[
              { label: 'Demandes waitlist', value: funnelWaitlist, color: 'bg-zinc-600' },
              { label: 'Comptes créés', value: funnelInscrits, color: 'bg-blue-500' },
              { label: 'Agences avec projet', value: funnelProjet, color: 'bg-green-600' },
              { label: 'Agences avec AO lancé', value: funnelAO, color: 'bg-emerald-500' },
            ].map(({ label, value, color }) => {
              const pct = funnelWaitlist > 0 ? Math.round((value / funnelWaitlist) * 100) : 0
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-400">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-600">{pct}%</span>
                      <span className="text-sm font-semibold text-zinc-200 w-8 text-right">{value}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  accent,
  suffix,
}: {
  label: string
  value: number
  accent?: 'red' | 'green' | 'blue' | 'amber'
  suffix?: string
}) {
  const accentMap: Record<string, string> = {
    red: 'text-red-400',
    green: 'text-green-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
  }
  const accentClass = (accent ? accentMap[accent] : null) ?? 'text-zinc-100'

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className={`text-3xl font-bold mb-1 ${accentClass}`}>
        {value}{suffix && <span className="text-xl ml-0.5">{suffix}</span>}
      </div>
      <div className="text-zinc-500 text-xs">{label}</div>
    </div>
  )
}
