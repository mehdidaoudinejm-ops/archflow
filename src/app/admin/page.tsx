import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import {
  Users, Building2, TrendingUp, FolderOpen, FileText,
  Briefcase, UserCheck, Activity, Clock, Send,
} from 'lucide-react'
import { COLLABORATOR_LIMITS, AI_IMPORT_LIMITS } from '@/lib/project-limits'
import { WeeklySignupsChart } from '@/components/shell/WeeklySignupsChart'
import { SetupStorageButton } from '@/components/shell/SetupStorageButton'
import { BackfillAnnuaireButton } from '@/components/shell/BackfillAnnuaireButton'
import { AdminSuspendButton } from '@/components/shell/AdminSuspendButton'

export const dynamic = 'force-dynamic'

const MRR_BY_PLAN: Record<string, number> = {
  SOLO: 29,
  STUDIO: 79,
  AGENCY: 199,
}

const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  ARCHITECT:    { bg: '#EAF3ED', color: '#1A5C3A' },
  COLLABORATOR: { bg: '#EEF2FF', color: '#4338CA' },
  COMPANY:      { bg: '#FEF3E2', color: '#B45309' },
  CLIENT:       { bg: '#F3F4F6', color: '#6B7280' },
  ADMIN:        { bg: '#FEE8E8', color: '#9B1C1C' },
}

const PLAN_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  SOLO:   { bg: '#F3F4F6', color: '#6B7280',  label: 'Solo' },
  STUDIO: { bg: '#EEF2FF', color: '#4338CA',  label: 'Studio' },
  AGENCY: { bg: '#EAF3ED', color: '#1A5C3A',  label: 'Agency' },
}

const AO_STATUS_LABEL: Record<string, string> = {
  DRAFT:       'Brouillon',
  SENT:        'Envoyé',
  IN_PROGRESS: 'En cours',
  CLOSED:      'Clôturé',
  ARCHIVED:    'Archivé',
}

export default async function AdminDashboardPage() {
  let dbError = false

  // ── Stats ─────────────────────────────────────────────────────────────────
  let totalUsers = 0
  let activeArchitects = 0
  let totalArchAgencies = 0
  let totalCompanyAgencies = 0
  let mrr = 0
  let activeProjects = 0
  let activeAOs = 0
  let newUsersLast30Days = 0
  let invitedCompanies = 0

  // ── Tables ────────────────────────────────────────────────────────────────
  let recentUsers: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    role: string
    suspended: boolean
    createdAt: Date
    agency: { name: string } | null
  }[] = []

  type AgencyRow = {
    id: string
    name: string
    plan: string
    activeModules: string[]
    createdAt: Date
    _count: { users: number; projects: number }
  }
  let recentAgencies: AgencyRow[] = []

  // ── Activité ──────────────────────────────────────────────────────────────
  type ProjectRow = {
    id: string
    name: string
    status: string
    createdAt: Date
    agency: { name: string }
  }
  type AORow = {
    id: string
    name: string
    status: string
    createdAt: Date
    dpgf: { project: { name: string; id: string } }
  }
  let recentProjects: ProjectRow[] = []
  let recentAOs: AORow[] = []

  // ── Graphique ──────────────────────────────────────────────────────────────
  let weeklySignups: { label: string; users: number }[] = []

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const eightWeeksAgo = new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000)

    const [
      usersTotal,
      architectsActive,
      agenciesAll,
      projectsActive,
      aosActive,
      usersNew,
      companiesInvited,
      usersRecent,
      agenciesRecent,
      projectsRecent,
      aosRecent,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ARCHITECT', suspended: false } }),
      prisma.agency.findMany({ select: { plan: true, activeModules: true } }),
      prisma.project.count({ where: { status: 'ACTIVE' } }),
      prisma.aO.count({ where: { status: { in: ['SENT', 'IN_PROGRESS'] } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { role: 'COMPANY' } }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          suspended: true,
          createdAt: true,
          agency: { select: { name: true } },
        },
      }),
      prisma.agency.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          plan: true,
          activeModules: true,
          createdAt: true,
          _count: { select: { users: true, projects: true } },
        },
      }),
      prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          agency: { select: { name: true } },
        },
      }),
      prisma.aO.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          dpgf: { select: { project: { select: { id: true, name: true } } } },
        },
      }),
    ])

    totalUsers = usersTotal
    activeArchitects = architectsActive
    invitedCompanies = companiesInvited
    // Agences archi = activeModules contient "dpgf" | Entreprises construction = activeModules vide
    totalArchAgencies = agenciesAll.filter((a) => a.activeModules.includes('dpgf')).length
    totalCompanyAgencies = agenciesAll.filter((a) => !a.activeModules.includes('dpgf')).length
    mrr = agenciesAll
      .filter((a) => a.activeModules.includes('dpgf'))
      .reduce((sum, a) => sum + (MRR_BY_PLAN[a.plan] ?? 0), 0)
    activeProjects = projectsActive
    activeAOs = aosActive
    newUsersLast30Days = usersNew
    recentUsers = usersRecent
    recentAgencies = agenciesRecent as AgencyRow[]
    recentProjects = projectsRecent as ProjectRow[]
    recentAOs = aosRecent as AORow[]

    // Inscriptions par semaine
    const signups = await prisma.user.findMany({
      where: { createdAt: { gte: eightWeeksAgo } },
      select: { createdAt: true },
    })
    weeklySignups = Array.from({ length: 8 }, (_, i) => {
      const start = new Date(eightWeeksAgo.getTime() + i * 7 * 24 * 60 * 60 * 1000)
      const end   = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
      return {
        label: start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        users: signups.filter((u) => u.createdAt >= start && u.createdAt < end).length,
      }
    })
  } catch (err) {
    console.error('[AdminDashboard]', err)
    dbError = true
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1A1A18' }}>
              Dashboard Admin
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#6B6B65' }}>
              Vue d&apos;ensemble ArchFlow ·{' '}
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>

        {dbError && (
          <div className="px-4 py-3 rounded-xl text-sm" style={{ background: '#FEE8E8', color: '#9B1C1C', border: '1px solid #FCA5A5' }}>
            Impossible de charger les données — vérifiez la connexion à la base de données.
          </div>
        )}

        {/* ── Stats cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Users size={20} />}
            iconBg="#EAF3ED" iconColor="#1A5C3A"
            label="Total utilisateurs"
            value={totalUsers}
            sub={`+${newUsersLast30Days} ce mois`}
            subColor="#1A5C3A"
          />
          <StatCard
            icon={<UserCheck size={20} />}
            iconBg="#EEF2FF" iconColor="#4338CA"
            label="Architectes actifs"
            value={activeArchitects}
          />
          <StatCard
            icon={<Building2 size={20} />}
            iconBg="#FEF3E2" iconColor="#B45309"
            label="Agences archi"
            value={totalArchAgencies}
          />
          <StatCard
            icon={<Briefcase size={20} />}
            iconBg="#F3F4F6" iconColor="#6B7280"
            label="Entreprises construction"
            value={totalCompanyAgencies}
          />
          <StatCard
            icon={<TrendingUp size={20} />}
            iconBg="#EAF3ED" iconColor="#1A5C3A"
            label="MRR estimé (archi)"
            value={mrr}
            suffix="€"
          />
          <StatCard
            icon={<FolderOpen size={20} />}
            iconBg="#F3F4F6" iconColor="#6B7280"
            label="Projets actifs"
            value={activeProjects}
          />
          <StatCard
            icon={<FileText size={20} />}
            iconBg="#FEF3E2" iconColor="#B45309"
            label="AO en cours"
            value={activeAOs}
          />
          <StatCard
            icon={<Send size={20} />}
            iconBg="#EEF2FF" iconColor="#4338CA"
            label="Entreprises invitées"
            value={invitedCompanies}
            sub="emails uniques"
          />
        </div>

        {/* ── Graphique inscriptions ────────────────────────────────────── */}
        <Card title="Inscriptions — 8 dernières semaines">
          <WeeklySignupsChart data={weeklySignups} />
        </Card>

        {/* ── Derniers utilisateurs ─────────────────────────────────────── */}
        <Card
          title="Derniers utilisateurs"
          action={<Link href="/admin/users" className="text-xs font-medium" style={{ color: '#1A5C3A' }}>Voir tous →</Link>}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #E8E8E3' }}>
                  {['Utilisateur', 'Agence', 'Rôle', 'Créé le', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#6B6B65', fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((u, i) => {
                  const roleBadge = ROLE_BADGE[u.role] ?? { bg: '#F3F4F6', color: '#6B7280' }
                  const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || '—'
                  return (
                    <tr key={u.id} style={{ borderBottom: i < recentUsers.length - 1 ? '1px solid #E8E8E3' : undefined }}>
                      <td className="px-4 py-3">
                        <div className="font-medium" style={{ color: '#1A1A18' }}>{name}</div>
                        <div className="text-xs" style={{ color: '#9B9B94' }}>{u.email}</div>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#6B6B65' }}>
                        {u.agency?.name ?? <span style={{ color: '#9B9B94' }}>—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: roleBadge.bg, color: roleBadge.color }}
                        >
                          {u.role}
                        </span>
                        {u.suspended && (
                          <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#FEE8E8', color: '#9B1C1C' }}>
                            Suspendu
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#9B9B94' }}>
                        {u.createdAt.toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <AdminSuspendButton userId={u.id} initialSuspended={u.suspended} />
                      </td>
                    </tr>
                  )
                })}
                {recentUsers.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: '#9B9B94' }}>Aucun utilisateur</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── Dernières agences ─────────────────────────────────────────── */}
        <Card title="Derniers comptes (agences &amp; entreprises)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #E8E8E3' }}>
                  {['Nom', 'Type', 'Plan', 'Membres', 'Projets', 'Créé le'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#6B6B65', fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentAgencies.map((a, i) => {
                  const isArchi = a.activeModules.includes('dpgf')
                  const planBadge = PLAN_BADGE[a.plan] ?? { bg: '#F3F4F6', color: '#6B7280', label: a.plan }
                  return (
                    <tr key={a.id} style={{ borderBottom: i < recentAgencies.length - 1 ? '1px solid #E8E8E3' : undefined }}>
                      <td className="px-4 py-3 font-medium" style={{ color: '#1A1A18' }}>{a.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={isArchi
                            ? { background: '#EEF2FF', color: '#4338CA' }
                            : { background: '#FEF3E2', color: '#B45309' }
                          }
                        >
                          {isArchi ? 'Agence archi' : 'Entreprise'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isArchi ? (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: planBadge.bg, color: planBadge.color }}
                          >
                            {planBadge.label}
                          </span>
                        ) : (
                          <span style={{ color: '#9B9B94', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums" style={{ color: '#6B6B65' }}>{a._count.users}</td>
                      <td className="px-4 py-3 tabular-nums" style={{ color: '#6B6B65' }}>{a._count.projects}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#9B9B94' }}>
                        {a.createdAt.toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  )
                })}
                {recentAgencies.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: '#9B9B94' }}>Aucun compte</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── Activité récente ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Derniers projets */}
          <Card title="Derniers projets" icon={<FolderOpen size={15} />}>
            <div className="divide-y" style={{ borderColor: '#E8E8E3' }}>
              {recentProjects.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <Link
                      href={`/dpgf/${p.id}`}
                      className="text-sm font-medium hover:underline"
                      style={{ color: '#1A1A18' }}
                    >
                      {p.name}
                    </Link>
                    <div className="text-xs" style={{ color: '#9B9B94' }}>{p.agency.name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: p.status === 'ACTIVE' ? '#EAF3ED' : '#F3F4F6',
                        color: p.status === 'ACTIVE' ? '#1A5C3A' : '#6B7280',
                      }}
                    >
                      {p.status === 'ACTIVE' ? 'Actif' : 'Archivé'}
                    </span>
                    <span className="text-xs" style={{ color: '#9B9B94' }}>
                      {p.createdAt.toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              ))}
              {recentProjects.length === 0 && (
                <div className="px-4 py-8 text-center text-sm" style={{ color: '#9B9B94' }}>Aucun projet</div>
              )}
            </div>
          </Card>

          {/* Derniers AO */}
          <Card title="Derniers appels d'offre" icon={<Activity size={15} />}>
            <div className="divide-y" style={{ borderColor: '#E8E8E3' }}>
              {recentAOs.map((ao) => (
                <div key={ao.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium" style={{ color: '#1A1A18' }}>{ao.name}</div>
                    <div className="text-xs" style={{ color: '#9B9B94' }}>{ao.dpgf.project.name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: ['SENT','IN_PROGRESS'].includes(ao.status) ? '#FEF3E2' : '#F3F4F6',
                        color: ['SENT','IN_PROGRESS'].includes(ao.status) ? '#B45309' : '#6B7280',
                      }}
                    >
                      {AO_STATUS_LABEL[ao.status] ?? ao.status}
                    </span>
                    <span className="text-xs" style={{ color: '#9B9B94' }}>
                      {ao.createdAt.toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              ))}
              {recentAOs.length === 0 && (
                <div className="px-4 py-8 text-center text-sm" style={{ color: '#9B9B94' }}>Aucun AO</div>
              )}
            </div>
          </Card>

        </div>

        {/* ── Limites par plan ──────────────────────────────────────────── */}
        <Card title="Limites par plan">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #E8E8E3' }}>
                  {['Plan', 'Collaborateurs', 'Imports IA / mois'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 font-medium" style={{ color: '#6B6B65', fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(['SOLO', 'STUDIO', 'AGENCY'] as const).map((plan, i) => {
                  const planBadge = PLAN_BADGE[plan]
                  const collab = COLLABORATOR_LIMITS[plan]
                  const ai = AI_IMPORT_LIMITS[plan]
                  return (
                    <tr key={plan} style={{ borderBottom: i < 2 ? '1px solid #E8E8E3' : undefined }}>
                      <td className="px-5 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: planBadge.bg, color: planBadge.color }}
                        >
                          {planBadge.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 tabular-nums" style={{ color: '#1A1A18' }}>
                        {collab === 0 ? <span style={{ color: '#9B9B94' }}>Aucun</span> : collab}
                      </td>
                      <td className="px-5 py-3 tabular-nums" style={{ color: '#1A1A18' }}>
                        {ai === Infinity ? <span style={{ color: '#1A5C3A' }}>Illimité</span> : ai}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── Outils maintenance ────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9B9B94' }}>
            Outils maintenance
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SetupStorageButton />
            <BackfillAnnuaireButton />
          </div>
        </div>

    </div>
  )
}

// ── Composants locaux ──────────────────────────────────────────────────────

function StatCard({
  icon, iconBg, iconColor, label, value, suffix, sub, subColor,
}: {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  label: string
  value: number
  suffix?: string
  sub?: string
  subColor?: string
}) {
  return (
    <div
      className="p-5 rounded-[14px]"
      style={{ background: '#fff', border: '1px solid #E8E8E3', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold mb-0.5 tabular-nums" style={{ color: '#1A1A18' }}>
        {value.toLocaleString('fr-FR')}{suffix && <span className="text-xl ml-1">{suffix}</span>}
      </div>
      <div className="text-sm" style={{ color: '#6B6B65' }}>{label}</div>
      {sub && (
        <div className="text-xs mt-1 font-medium" style={{ color: subColor ?? '#9B9B94' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

function Card({
  title, action, icon, children,
}: {
  title: string
  action?: React.ReactNode
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-[14px] overflow-hidden"
      style={{ background: '#fff', border: '1px solid #E8E8E3', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid #E8E8E3' }}
      >
        <div className="flex items-center gap-2">
          {icon && <span style={{ color: '#9B9B94' }}>{icon}</span>}
          <h2 className="text-sm font-semibold" style={{ color: '#1A1A18' }}>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
