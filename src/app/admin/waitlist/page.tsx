'use client'

import { useCallback, useEffect, useState } from 'react'

interface WaitlistEntry {
  id: string
  firstName: string
  lastName: string
  email: string
  cabinetName: string
  city: string
  message: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  approvedAt: string | null
}

type Filter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

const statusStyle: Record<string, { bg: string; color: string }> = {
  PENDING:  { bg: '#FEF3E2', color: '#B45309' },
  APPROVED: { bg: '#EAF3ED', color: '#1A5C3A' },
  REJECTED: { bg: '#FEE8E8', color: '#9B1C1C' },
}
const statusLabel: Record<string, string> = {
  PENDING:  'En attente',
  APPROVED: 'Approuvé',
  REJECTED: 'Refusé',
}

export default function AdminWaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<Filter>('PENDING')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    const data = await fetch('/api/admin/waitlist').then((r) => r.json()) as WaitlistEntry[]
    setEntries(data)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAction(id: string, action: 'approve' | 'reject' | 'resend') {
    setActionLoading(`${action}-${id}`)
    const res = await fetch(`/api/admin/waitlist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      if (action === 'approve') {
        setEntries((prev) => prev.map((e) => e.id === id ? { ...e, status: 'APPROVED', approvedAt: new Date().toISOString() } : e))
      } else if (action === 'reject') {
        setEntries((prev) => prev.map((e) => e.id === id ? { ...e, status: 'REJECTED' } : e))
      }
    }
    setActionLoading(null)
  }

  const counts = {
    ALL:      entries.length,
    PENDING:  entries.filter((e) => e.status === 'PENDING').length,
    APPROVED: entries.filter((e) => e.status === 'APPROVED').length,
    REJECTED: entries.filter((e) => e.status === 'REJECTED').length,
  }

  const filtered = filter === 'ALL' ? entries : entries.filter((e) => e.status === filter)

  const tabs: { key: Filter; label: string }[] = [
    { key: 'PENDING',  label: 'En attente' },
    { key: 'APPROVED', label: 'Approuvés' },
    { key: 'REJECTED', label: 'Refusés' },
    { key: 'ALL',      label: 'Historique complet' },
  ]

  if (loading) return <div className="p-8 text-sm" style={{ color: '#9B9B94' }}>Chargement...</div>

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#1A1A18' }}>Liste d&apos;attente</h1>
          <p className="text-sm" style={{ color: '#6B6B65' }}>
            {counts.PENDING} en attente · {counts.APPROVED} approuvés · {counts.REJECTED} refusés
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
          style={{ background: '#F3F4F6', color: '#6B6B65', border: '1px solid #E8E8E3' }}
        >
          <span className={refreshing ? 'animate-spin' : ''}>↻</span>
          {refreshing ? 'Actualisation...' : 'Actualiser'}
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 mb-5 rounded-lg p-1 w-fit"
        style={{ background: '#F3F4F6', border: '1px solid #E8E8E3' }}
      >
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="px-3 py-1.5 rounded-md text-sm transition-colors"
            style={{
              background: filter === key ? '#fff' : 'transparent',
              color: filter === key ? '#1A1A18' : '#6B6B65',
              fontWeight: filter === key ? 600 : 400,
              boxShadow: filter === key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            {label}
            <span className="ml-1.5 text-xs" style={{ color: filter === key ? '#6B6B65' : '#9B9B94' }}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div
        className="rounded-[14px] overflow-hidden"
        style={{ background: '#fff', border: '1px solid #E8E8E3', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #E8E8E3' }}>
              {['Nom', 'Email', 'Cabinet · Ville', 'Demandé le', 'Statut', ''].map((h) => (
                <th key={h} className="text-left px-5 py-3 font-medium" style={{ color: '#6B6B65', fontSize: 12 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry, i) => {
              const ss = statusStyle[entry.status]
              const isLast = i === filtered.length - 1
              return (
                <>
                  <tr
                    key={entry.id}
                    className="cursor-pointer transition-colors hover:bg-[#F8F8F6]"
                    style={{ borderBottom: !isLast || expanded === entry.id ? '1px solid #E8E8E3' : undefined }}
                    onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                  >
                    <td className="px-5 py-3 font-medium" style={{ color: '#1A1A18' }}>
                      {entry.firstName} {entry.lastName}
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: '#6B6B65' }}>{entry.email}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: '#6B6B65' }}>
                      {entry.cabinetName}
                      <span style={{ color: '#9B9B94' }}> · {entry.city}</span>
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: '#9B9B94' }}>
                      {new Date(entry.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded font-medium"
                        style={{ background: ss.bg, color: ss.color }}
                      >
                        {statusLabel[entry.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {entry.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleAction(entry.id, 'approve')}
                              disabled={actionLoading !== null}
                              className="text-xs px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                              style={{ background: '#EAF3ED', color: '#1A5C3A', border: '1px solid #C6DFCe' }}
                            >
                              {actionLoading === `approve-${entry.id}` ? '...' : 'Approuver'}
                            </button>
                            <button
                              onClick={() => handleAction(entry.id, 'reject')}
                              disabled={actionLoading !== null}
                              className="text-xs px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                              style={{ background: '#FEE8E8', color: '#9B1C1C', border: '1px solid #FCA5A5' }}
                            >
                              {actionLoading === `reject-${entry.id}` ? '...' : 'Refuser'}
                            </button>
                          </>
                        )}
                        {entry.status === 'APPROVED' && (
                          <button
                            onClick={() => handleAction(entry.id, 'resend')}
                            disabled={actionLoading !== null}
                            className="text-xs px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                            style={{ background: '#F3F4F6', color: '#6B6B65', border: '1px solid #E8E8E3' }}
                          >
                            {actionLoading === `resend-${entry.id}` ? '...' : 'Renvoyer invitation'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {expanded === entry.id && (
                    <tr key={`${entry.id}-expanded`} style={{ borderBottom: !isLast ? '1px solid #E8E8E3' : undefined, background: '#F8F8F6' }}>
                      <td colSpan={6} className="px-5 py-3">
                        {entry.message ? (
                          <p className="text-sm italic" style={{ color: '#6B6B65' }}>&ldquo;{entry.message}&rdquo;</p>
                        ) : (
                          <p className="text-sm" style={{ color: '#9B9B94' }}>Aucun message.</p>
                        )}
                        {entry.approvedAt && (
                          <p className="text-xs mt-1" style={{ color: '#9B9B94' }}>
                            Approuvé le {new Date(entry.approvedAt).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm" style={{ color: '#9B9B94' }}>
                  Aucune entrée dans cette catégorie.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
