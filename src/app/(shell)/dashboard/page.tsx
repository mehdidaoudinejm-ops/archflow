import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUserWithProfile } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Plus, FolderOpen } from 'lucide-react'

export default async function DashboardPage() {
  const user = await getUserWithProfile()

  if (!user) {
    redirect('/login')
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
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dpgf/${project.id}`}
              className="block p-5 rounded-[var(--radius-lg)] border transition-shadow hover:shadow-md group"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                className="w-10 h-10 rounded-[var(--radius)] flex items-center justify-center mb-4"
                style={{ background: 'var(--green-light)' }}
              >
                <FolderOpen size={20} style={{ color: 'var(--green)' }} />
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
              <p className="text-xs mt-3" style={{ color: 'var(--text3)' }}>
                {new Date(project.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
