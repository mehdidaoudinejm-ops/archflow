'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FolderOpen, Plus, MoreVertical, Archive, Trash2, RotateCcw, Users, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AOData {
  id: string
  status: string
  deadline: string
  _count: { aoCompanies: number }
  aoCompanies: { id: string }[]
  publishedElements: Record<string, unknown> | null
}

interface ProjectData {
  id: string
  name: string
  address: string | null
  status: 'ACTIVE' | 'ARCHIVED'
  createdAt: string
  dpgfs: { aos: AOData[] }[]
}

interface Collaborator {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
}

interface Props {
  initialProjects: ProjectData[]
  initialArchivedProjects: ProjectData[]
  plan: string
  activeCount: number
  projectLimit: number
  collaborators: Collaborator[]
  permissionsByProject: Record<string, string[]>
  isArchitect: boolean
}

// ── Badges AO ─────────────────────────────────────────────────────────────────

function aoBadge(status: string, publishedElements?: Record<string, unknown> | null) {
  switch (status) {
    case 'SENT':
    case 'IN_PROGRESS':
      return { label: 'En consultation', bg: 'var(--amber-light)', color: 'var(--amber)' }
    case 'CLOSED':
      return { label: 'Clôturé', bg: '#FEE8E8', color: '#9B1C1C' }
    case 'ANALYSED':
      return { label: 'En analyse', bg: '#EEF2FF', color: '#4338CA' }
    case 'AWARDED': {
      const winner = publishedElements?.awardedCompanyId ? '• Lauréat désigné' : ''
      return { label: `Attribué ${winner}`.trim(), bg: 'var(--green-light)', color: 'var(--green)' }
    }
    case 'INFRUCTUEUX':
      return { label: 'Infructueux', bg: 'var(--surface2)', color: 'var(--text2)' }
    case 'DRAFT':
      return { label: 'AO brouillon', bg: 'var(--surface2)', color: 'var(--text3)' }
    default:
      return null
  }
}

// ── Modal invite collaborateur ─────────────────────────────────────────────────

function CollaboratorModal({
  projectId,
  projectName,
  collaborators,
  initialPermissions,
  onClose,
}: {
  projectId: string
  projectName: string
  collaborators: Collaborator[]
  initialPermissions: string[]
  onClose: () => void
}) {
  const [permissions, setPermissions] = useState<Set<string>>(new Set(initialPermissions))
  const [loading, setLoading] = useState<string | null>(null)

  async function toggle(userId: string) {
    setLoading(userId)
    const hasAccess = permissions.has(userId)
    try {
      if (hasAccess) {
        await fetch(`/api/projects/${projectId}/permissions?userId=${userId}`, { method: 'DELETE' })
        setPermissions((prev) => { const s = new Set(prev); s.delete(userId); return s })
      } else {
        await fetch(`/api/projects/${projectId}/permissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        })
        setPermissions((prev) => new Set(Array.from(prev).concat(userId)))
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[var(--radius-lg)] p-6"
        style={{ background: '#fff', boxShadow: 'var(--shadow-md)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
              Accès collaborateurs
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text2)' }}>{projectName}</p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text3)' }}>
            <X size={18} />
          </button>
        </div>

        {collaborators.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--text3)' }}>
            Aucun collaborateur dans l&apos;agence.{' '}
            <Link href="/settings" className="underline" style={{ color: 'var(--green)' }}>
              Inviter un collaborateur
            </Link>
          </p>
        ) : (
          <div className="space-y-2">
            {collaborators.map((c) => {
              const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email
              const hasAccess = permissions.has(c.id)
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between px-4 py-3 rounded-[var(--radius)]"
                  style={{ background: hasAccess ? 'var(--green-light)' : 'var(--surface2)' }}
                >
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{name}</div>
                    <div className="text-xs" style={{ color: 'var(--text2)' }}>{c.email}</div>
                  </div>
                  <button
                    onClick={() => toggle(c.id)}
                    disabled={loading === c.id}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                    style={{
                      background: hasAccess ? 'var(--green)' : '#fff',
                      color: hasAccess ? '#fff' : 'var(--text2)',
                      border: hasAccess ? 'none' : '1px solid var(--border)',
                    }}
                  >
                    {loading === c.id ? '...' : hasAccess ? <><Check size={12} /> Accès</>  : 'Donner accès'}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-lg"
            style={{ background: 'var(--surface2)', color: 'var(--text2)' }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────

export function DashboardClient({
  initialProjects,
  initialArchivedProjects,
  plan,
  activeCount,
  projectLimit,
  collaborators,
  permissionsByProject,
  isArchitect,
}: Props) {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectData[]>(initialProjects)
  const [archivedProjects, setArchivedProjects] = useState<ProjectData[]>(initialArchivedProjects)
  const [showArchived, setShowArchived] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [colabModal, setColabModal] = useState<{ projectId: string; projectName: string } | null>(null)
  const [perms, setPerms] = useState<Record<string, string[]>>(permissionsByProject)

  const atLimit = projectLimit !== Infinity && activeCount >= projectLimit

  async function archiveProject(project: ProjectData) {
    setActionLoading(`archive-${project.id}`)
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ARCHIVED' }),
    })
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== project.id))
      setArchivedProjects((prev) => [{ ...project, status: 'ARCHIVED' }, ...prev])
    }
    setActionLoading(null)
  }

  async function restoreProject(project: ProjectData) {
    setActionLoading(`restore-${project.id}`)
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ACTIVE' }),
    })
    if (res.ok) {
      setArchivedProjects((prev) => prev.filter((p) => p.id !== project.id))
      setProjects((prev) => [{ ...project, status: 'ACTIVE' }, ...prev])
    }
    setActionLoading(null)
  }

  async function deleteProject(project: ProjectData) {
    if (!window.confirm(`Supprimer définitivement "${project.name}" ? Cette action est irréversible.`)) return
    setActionLoading(`delete-${project.id}`)
    const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== project.id))
      setArchivedProjects((prev) => prev.filter((p) => p.id !== project.id))
      router.refresh()
    } else {
      const data = await res.json() as { error?: string }
      alert(data.error ?? 'Impossible de supprimer ce projet.')
    }
    setActionLoading(null)
  }

  function ProjectCard({ project, archived = false }: { project: ProjectData; archived?: boolean }) {
    const ao = project.dpgfs[0]?.aos[0] ?? null
    const publishedElements = ao?.publishedElements ?? null
    const badge = ao ? aoBadge(ao.status, publishedElements as Record<string, unknown> | null) : null
    const isActive = ao?.status === 'SENT' || ao?.status === 'IN_PROGRESS'
    const totalCompanies = ao?._count.aoCompanies ?? 0
    const submittedCount = ao?.aoCompanies.length ?? 0
    const daysLeft = ao?.deadline
      ? Math.ceil((new Date(ao.deadline).getTime() - Date.now()) / 86400000)
      : null
    const isActioning = actionLoading === `archive-${project.id}` ||
      actionLoading === `restore-${project.id}` ||
      actionLoading === `delete-${project.id}`

    return (
      <div
        className="rounded-[var(--radius-lg)] border transition-shadow hover:shadow-md"
        style={{
          background: archived ? 'var(--surface2)' : 'var(--surface)',
          borderColor: isActive ? 'var(--amber)' : 'var(--border)',
          boxShadow: 'var(--shadow-sm)',
          opacity: archived ? 0.8 : 1,
          cursor: archived ? 'default' : 'pointer',
        }}
        onClick={() => { if (!archived) router.push(`/dpgf/${project.id}`) }}
      >
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div
              className="w-10 h-10 rounded-[var(--radius)] flex items-center justify-center"
              style={{ background: archived ? 'var(--border)' : 'var(--green-light)' }}
            >
              <FolderOpen size={20} style={{ color: archived ? 'var(--text3)' : 'var(--green)' }} />
            </div>

            <div className="flex items-center gap-2">
              {badge && (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: badge.bg, color: badge.color }}
                >
                  {badge.label}
                </span>
              )}

              {/* Kebab menu — ARCHITECT only */}
              {isArchitect && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="p-1 rounded hover:bg-[var(--surface2)] transition-colors"
                      style={{ color: 'var(--text3)' }}
                      disabled={isActioning}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical size={15} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {/* Collaborateurs - STUDIO/AGENCY only */}
                    {collaborators.length > 0 && (
                      <>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault()
                            setColabModal({ projectId: project.id, projectName: project.name })
                          }}
                          className="gap-2 cursor-pointer"
                        >
                          <Users size={14} />
                          Gérer les accès
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}

                    {!archived ? (
                      <DropdownMenuItem
                        onClick={(e) => { e.preventDefault(); void archiveProject(project) }}
                        className="gap-2 cursor-pointer"
                        style={{ color: 'var(--amber)' }}
                      >
                        <Archive size={14} />
                        Archiver
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={(e) => { e.preventDefault(); void restoreProject(project) }}
                        className="gap-2 cursor-pointer"
                        style={{ color: 'var(--green)' }}
                      >
                        <RotateCcw size={14} />
                        Restaurer
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); void deleteProject(project) }}
                      className="gap-2 cursor-pointer"
                      style={{ color: 'var(--red)' }}
                    >
                      <Trash2 size={14} />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <h2
            className="font-medium text-sm mb-1"
            style={{ color: archived ? 'var(--text2)' : 'var(--text)' }}
          >
            {project.name}
          </h2>
          {project.address && (
            <p className="text-xs" style={{ color: 'var(--text3)' }}>
              {project.address}
            </p>
          )}

          {isActive && totalCompanies > 0 ? (
            <p className="text-xs mt-3 font-medium" style={{ color: 'var(--amber)' }}>
              {submittedCount}/{totalCompanies} offre{totalCompanies > 1 ? 's' : ''} reçue{submittedCount > 1 ? 's' : ''}
              {daysLeft !== null && daysLeft > 0 && ` · J-${daysLeft}`}
              {daysLeft !== null && daysLeft <= 0 && ' · Délai dépassé'}
            </p>
          ) : (
            <p className="text-xs mt-3" style={{ color: 'var(--text3)' }}>
              {archived ? 'Archivé · ' : ''}
              {new Date(project.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl"
            style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--text)' }}
          >
            Mes projets
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text2)' }}>
            {projectLimit === Infinity
              ? `${projects.length} projet${projects.length !== 1 ? 's' : ''} actif${projects.length !== 1 ? 's' : ''}`
              : `${projects.length} / ${projectLimit} projet${projectLimit > 1 ? 's' : ''} · plan ${plan}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {archivedProjects.length > 0 && (
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="text-sm px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: showArchived ? 'var(--surface2)' : 'transparent',
                color: 'var(--text2)',
                border: '1px solid var(--border)',
              }}
            >
              {showArchived ? 'Masquer archivés' : `Archivés (${archivedProjects.length})`}
            </button>
          )}
          <Button
            onClick={() => {
              if (atLimit) {
                alert(`Limite atteinte pour le plan ${plan}. Archivez un projet ou passez à un plan supérieur.`)
                return
              }
              router.push('/dashboard/new')
            }}
            style={{ background: atLimit ? 'var(--surface2)' : 'var(--green-btn)', color: atLimit ? 'var(--text3)' : '#fff', border: 'none' }}
          >
            <Plus size={16} className="mr-2" />
            Nouveau projet
          </Button>
        </div>
      </div>

      {/* Barre de limite */}
      {projectLimit !== Infinity && (
        <div className="mb-6 flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min((projects.length / projectLimit) * 100, 100)}%`,
                background: atLimit ? 'var(--red)' : 'var(--green)',
              }}
            />
          </div>
          <span className="text-xs font-medium tabular-nums" style={{ color: atLimit ? 'var(--red)' : 'var(--text2)' }}>
            {projects.length}/{projectLimit}
          </span>
          {atLimit && (
            <Link href="/settings/billing" className="text-xs font-medium underline" style={{ color: 'var(--green)' }}>
              Changer de plan
            </Link>
          )}
        </div>
      )}

      {/* Projets actifs */}
      {projects.length === 0 && !showArchived ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-[var(--radius-lg)] border-2 border-dashed"
          style={{ borderColor: 'var(--border)', color: 'var(--text3)' }}
        >
          <FolderOpen size={48} className="mb-4 opacity-40" />
          <p className="text-lg font-medium mb-1" style={{ color: 'var(--text2)' }}>
            Aucun projet pour l&apos;instant
          </p>
          <p className="text-sm mb-6">Créez votre premier projet pour commencer</p>
          <Button
            onClick={() => router.push('/dashboard/new')}
            style={{ background: 'var(--green-btn)', color: '#fff', border: 'none' }}
          >
            <Plus size={16} className="mr-2" />
            Créer un projet
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* Projets archivés */}
      {showArchived && archivedProjects.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text3)' }}>
            Archivés
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedProjects.map((project) => (
              <ProjectCard key={project.id} project={project} archived />
            ))}
          </div>
        </div>
      )}

      {/* Modal collaborateurs */}
      {colabModal && (
        <CollaboratorModal
          projectId={colabModal.projectId}
          projectName={colabModal.projectName}
          collaborators={collaborators}
          initialPermissions={perms[colabModal.projectId] ?? []}
          onClose={() => setColabModal(null)}
        />
      )}
    </>
  )
}
