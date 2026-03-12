import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUserWithProfile } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Plus, FolderOpen } from 'lucide-react'

function aoBadge(status: string) {
  switch (status) {
    case 'SENT':
    case 'IN_PROGRESS':
      return { label: 'En consultation', bg: 'var(--amber-light)', color: 'var(--amber)' }
    case 'CLOSED':
      return { label: 'Clôturée', bg: 'var(--green-light)', color: 'var(--green)' }
    case 'DRAFT':
      return { label: 'AO brouillon', bg: 'var(--surface2)', color: 'var(--text3)' }
    default:
      return null
  }
}

export default async function DashboardPage() {
  const user = await getUserWithProfile()

  if (!user) {
    redirect('/login')
  }

  if (user.role === 'COMPANY') {
    redirect('/mes-appels-doffres')
  }

  if (user.role === 'ADMIN') {
    redirect('/admin')
  }

  if (!user.agencyId) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <p style={{ color: 'var(--text2)' }}>
          Votre compte n&apos;est pas encore associé à une agence.
        </p>
      </div>
    )
  }

  const projects = await prisma.project.findMany({
    where: {
      agencyId: user.agencyId,
      status: 'ACTIVE',
    },
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
  })

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl"
            style={{
              fontFamily: '"DM Serif Display", serif',
              color: 'var(--text)',
            }}
          >
            Mes projets
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text2)' }}>
            {projects.length} projet{projects.length !== 1 ? 's' : ''} actif
            {projects.length !== 1 ? 's' : ''}
          </p>
        </div>

        <Button
          asChild
          style={{
            background: 'var(--green-btn)',
            color: '#fff',
            border: 'none',
          }}
        >
          <Link href="/dashboard/new">
            <Plus size={16} className="mr-2" />
            Nouveau projet
          </Link>
        </Button>
      </div>

      {/* Liste des projets */}
      {projects.length === 0 ? (
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
            asChild
            style={{
              background: 'var(--green-btn)',
              color: '#fff',
              border: 'none',
            }}
          >
            <Link href="/dashboard/new">
              <Plus size={16} className="mr-2" />
              Créer un projet
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const ao = project.dpgfs[0]?.aos[0] ?? null
            const badge = ao ? aoBadge(ao.status) : null
            const isActive = ao?.status === 'SENT' || ao?.status === 'IN_PROGRESS'
            const totalCompanies = ao?._count.aoCompanies ?? 0
            const submittedCount = ao?.aoCompanies.length ?? 0
            const daysLeft = ao?.deadline
              ? Math.ceil((new Date(ao.deadline).getTime() - Date.now()) / 86400000)
              : null

            return (
              <Link
                key={project.id}
                href={`/dpgf/${project.id}`}
                className="block p-5 rounded-[var(--radius-lg)] border transition-shadow hover:shadow-md group"
                style={{
                  background: 'var(--surface)',
                  borderColor: isActive ? 'var(--amber)' : 'var(--border)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-10 h-10 rounded-[var(--radius)] flex items-center justify-center"
                    style={{ background: 'var(--green-light)' }}
                  >
                    <FolderOpen size={20} style={{ color: 'var(--green)' }} />
                  </div>
                  {badge && (
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      {badge.label}
                    </span>
                  )}
                </div>

                <h2
                  className="font-medium text-sm mb-1 group-hover:text-[var(--green)] transition-colors"
                  style={{ color: 'var(--text)' }}
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
                    {new Date(project.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
