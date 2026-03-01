import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function SettingsPage() {
  const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

  const agency = user.agencyId
    ? await prisma.agency.findUnique({ where: { id: user.agencyId } })
    : null

  return (
    <div className="max-w-2xl mx-auto">
      <h1
        className="text-2xl mb-6"
        style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--text)' }}
      >
        Paramètres
      </h1>

      {/* Agence */}
      <section
        className="p-6 rounded-[var(--radius-lg)] mb-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
          Agence
        </h2>
        <dl className="space-y-3">
          <Row label="Nom" value={agency?.name ?? '—'} />
          <Row label="Plan" value={agency?.plan ?? '—'} />
          <Row label="Modules actifs" value={agency?.activeModules.join(', ') ?? '—'} />
        </dl>
      </section>

      {/* Compte */}
      <section
        className="p-6 rounded-[var(--radius-lg)]"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
          Mon compte
        </h2>
        <dl className="space-y-3">
          <Row label="Prénom" value={user.firstName ?? '—'} />
          <Row label="Nom" value={user.lastName ?? '—'} />
          <Row label="Email" value={user.email} />
          <Row label="Rôle" value={user.role} />
        </dl>
      </section>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
      <dt className="text-sm" style={{ color: 'var(--text3)' }}>{label}</dt>
      <dd className="text-sm font-medium" style={{ color: 'var(--text)' }}>{value}</dd>
    </div>
  )
}
