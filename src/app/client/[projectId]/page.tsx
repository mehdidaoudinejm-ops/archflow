import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Props {
  params: { projectId: string }
}

export default async function ClientPage({ params }: Props) {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({ where: { email: session.user.email! } })
  if (!user || user.role !== 'CLIENT') redirect('/login')

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    select: { id: true, name: true, clientUserId: true },
  })

  if (!project || project.clientUserId !== user.id) redirect('/login')

  const ao = await prisma.aO.findFirst({
    where: {
      dpgf: { projectId: params.projectId },
      clientPublished: true,
      status: { not: 'ARCHIVED' },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      deadline: true,
      status: true,
      publishedElements: true,
      aoCompanies: {
        select: {
          id: true,
          status: true,
          offer: { select: { isComplete: true, submittedAt: true } },
        },
      },
    },
  })

  const now = new Date()

  if (!ao) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <h1
          className="text-3xl mb-3"
          style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--text)' }}
        >
          {project.name}
        </h1>
        <p className="text-sm" style={{ color: 'var(--text2)' }}>
          L&apos;analyse de la consultation n&apos;a pas encore été publiée.
          <br />Vous recevrez une notification dès qu&apos;elle sera disponible.
        </p>
      </div>
    )
  }

  const publishedElements = (ao.publishedElements ?? {}) as Record<string, boolean>
  const totalInvited = ao.aoCompanies.length
  const totalSubmitted = ao.aoCompanies.filter((c) => c.status === 'SUBMITTED').length
  const responseRate = totalInvited ? Math.round((totalSubmitted / totalInvited) * 100) : 0
  const deadline = new Date(ao.deadline)
  const isDeadlinePassed = now > deadline
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* En-tête */}
      <div>
        <h1
          className="text-3xl mb-1"
          style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--text)' }}
        >
          {project.name}
        </h1>
        <p className="text-sm" style={{ color: 'var(--text2)' }}>{ao.name}</p>
      </div>

      {/* Countdown */}
      <div
        className="p-4 rounded-[var(--radius-lg)] flex items-center justify-between"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-wider mb-0.5" style={{ color: 'var(--text3)' }}>
            Date limite de remise des offres
          </p>
          <p className="text-base font-semibold" style={{ color: 'var(--text)' }}>
            {deadline.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {isDeadlinePassed ? (
          <span
            className="px-3 py-1.5 rounded-full text-sm font-medium"
            style={{ background: 'var(--surface2)', color: 'var(--text2)' }}
          >
            Délai dépassé
          </span>
        ) : (
          <span
            className="px-3 py-1.5 rounded-full text-sm font-medium"
            style={{ background: 'var(--amber-light)', color: 'var(--amber)' }}
          >
            J-{daysLeft}
          </span>
        )}
      </div>

      {/* Stats anonymisées */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Entreprises consultées', value: publishedElements.companies ? totalInvited : '—' },
          { label: 'Offres reçues', value: publishedElements.offers ? totalSubmitted : '—' },
          { label: 'Taux de réponse', value: publishedElements.offers ? `${responseRate}%` : '—' },
        ].map((stat, i) => (
          <div
            key={i}
            className="p-4 rounded-[var(--radius-lg)]"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            <p className="text-xs mb-1" style={{ color: 'var(--text3)' }}>{stat.label}</p>
            <p
              className="text-2xl font-semibold"
              style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--text)' }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Avancement anonymisé par entreprise */}
      {publishedElements.progress && (
        <div
          className="rounded-[var(--radius-lg)] overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="px-4 py-3 border-b" style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Avancement des réponses
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {ao.aoCompanies.map((company, i) => (
              <div key={company.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm" style={{ color: 'var(--text2)' }}>
                  Entreprise {String.fromCharCode(65 + i)}
                </span>
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{
                    background:
                      company.status === 'SUBMITTED' ? 'var(--green-light)' :
                      company.status === 'IN_PROGRESS' ? 'var(--amber-light)' :
                      'var(--surface2)',
                    color:
                      company.status === 'SUBMITTED' ? 'var(--green)' :
                      company.status === 'IN_PROGRESS' ? 'var(--amber)' :
                      'var(--text3)',
                  }}
                >
                  {company.status === 'SUBMITTED' ? 'Offre soumise' :
                   company.status === 'IN_PROGRESS' ? 'En cours' : 'En attente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section analyse verrouillée */}
      {!publishedElements.analysis && (
        <div
          className="p-6 rounded-[var(--radius-lg)] text-center"
          style={{ background: 'var(--surface)', border: '1px dashed var(--border2)' }}
        >
          <p className="text-2xl mb-2">🔒</p>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            Analyse comparative
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text2)' }}>
            L&apos;architecte publiera l&apos;analyse dès que toutes les offres auront été étudiées.
          </p>
        </div>
      )}
    </div>
  )
}
