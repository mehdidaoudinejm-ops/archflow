'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Subscription {
  agencyId: string
  agencyName: string
  plan: string
  amount: number
  freeAccess: boolean
  stripeCustomerId: string | null
  createdAt: string
  ownerEmail: string | null
  ownerId: string | null
  ownerName: string | null
}

interface BillingData {
  mrr: number
  subscriptions: Subscription[]
}

function PlanBadge({ plan }: { plan: string }) {
  const colors = {
    SOLO: { bg: 'var(--surface2)', color: 'var(--text3)' },
    STUDIO: { bg: '#EEF2FF', color: '#4338CA' },
    AGENCY: { bg: '#F0FDF4', color: '#166534' },
  }
  const c = colors[plan as keyof typeof colors] ?? colors.SOLO
  return <Badge style={{ background: c.bg, color: c.color, border: 'none' }}>{plan}</Badge>
}

export function BillingAdminClient() {
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/billing')
      .then(r => r.json())
      .then((d: BillingData) => setData(d))
      .finally(() => setLoading(false))
  }, [])

  async function toggleFreeAccess(ownerId: string, current: boolean) {
    setLoadingId(ownerId)
    await fetch(`/api/admin/users/${ownerId}/free-access`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ freeAccess: !current }),
    })
    // Recharger
    const res = await fetch('/api/admin/billing')
    const d = await res.json() as BillingData
    setData(d)
    setLoadingId(null)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <p style={{ color: 'var(--text3)' }}>Chargement...</p>
      </div>
    )
  }

  if (!data) return null

  const paid = data.subscriptions.filter(s => s.amount > 0)
  const free = data.subscriptions.filter(s => s.amount === 0)

  return (
    <div className="p-8 space-y-8 max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Facturation</h1>
        <p className="text-sm" style={{ color: 'var(--text3)' }}>Abonnements et revenus</p>
      </div>

      {/* MRR card */}
      <div className="grid grid-cols-3 gap-4">
        <div
          className="rounded-[var(--radius-lg)] p-6 col-span-1"
          style={{ background: '#DC2626', color: '#fff', boxShadow: 'var(--shadow-sm)' }}
        >
          <p className="text-sm opacity-80 mb-1">MRR estimé</p>
          <p className="text-3xl font-bold">{data.mrr} €</p>
          <p className="text-xs opacity-60 mt-1">Monthly Recurring Revenue</p>
        </div>
        <div
          className="rounded-[var(--radius-lg)] p-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm mb-1" style={{ color: 'var(--text3)' }}>Abonnements payants</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{paid.length}</p>
        </div>
        <div
          className="rounded-[var(--radius-lg)] p-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm mb-1" style={{ color: 'var(--text3)' }}>Accès gratuits</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            {data.subscriptions.filter(s => s.freeAccess).length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-[var(--radius-lg)] overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text2)' }}>Cabinet</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text2)' }}>Propriétaire</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text2)' }}>Plan</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text2)' }}>Montant/mois</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text2)' }}>Inscrit le</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {[...paid, ...free].map((sub, i) => (
              <tr
                key={sub.agencyId}
                style={{ borderBottom: i < data.subscriptions.length - 1 ? '1px solid var(--border)' : 'none' }}
              >
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--text)' }}>{sub.agencyName}</td>
                <td className="px-4 py-3">
                  <p style={{ color: 'var(--text)' }}>{sub.ownerName || '—'}</p>
                  <p className="text-xs" style={{ color: 'var(--text3)' }}>{sub.ownerEmail}</p>
                </td>
                <td className="px-4 py-3">
                  <PlanBadge plan={sub.plan} />
                  {sub.freeAccess && (
                    <Badge className="ml-1" style={{ background: '#FEF3C7', color: '#92400E', border: 'none', fontSize: '10px' }}>
                      Gratuit
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 font-semibold" style={{ color: sub.amount > 0 ? 'var(--text)' : 'var(--text3)' }}>
                  {sub.amount > 0 ? `${sub.amount} €` : '—'}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--text3)' }}>
                  {new Date(sub.createdAt).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-4 py-3">
                  {sub.ownerId && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loadingId === sub.ownerId}
                      onClick={() => { void toggleFreeAccess(sub.ownerId!, sub.freeAccess) }}
                      style={{ fontSize: '11px', height: '26px', padding: '0 8px', borderColor: 'var(--border2)' }}
                    >
                      {sub.freeAccess ? 'Retirer accès gratuit' : 'Accorder accès gratuit'}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
