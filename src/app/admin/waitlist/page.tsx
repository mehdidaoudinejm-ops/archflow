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

const statusBadge: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-400',
  APPROVED: 'bg-green-500/10 text-green-400',
  REJECTED: 'bg-red-500/10 text-red-400',
}
const statusLabel: Record<string, string> = {
  PENDING: 'En attente',
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
      // resend: no state change needed
    }
    setActionLoading(null)
  }

  const counts = {
    ALL: entries.length,
    PENDING: entries.filter((e) => e.status === 'PENDING').length,
    APPROVED: entries.filter((e) => e.status === 'APPROVED').length,
    REJECTED: entries.filter((e) => e.status === 'REJECTED').length,
  }

  const filtered = filter === 'ALL' ? entries : entries.filter((e) => e.status === filter)

  const tabs: { key: Filter; label: string }[] = [
    { key: 'PENDING', label: 'En attente' },
    { key: 'APPROVED', label: 'Approuvés' },
    { key: 'REJECTED', label: 'Refusés' },
    { key: 'ALL', label: 'Historique complet' },
  ]

  if (loading) return <div className="p-8 text-zinc-400">Chargement...</div>

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Liste d&apos;attente</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {counts.PENDING} en attente · {counts.APPROVED} approuvés · {counts.REJECTED} refusés
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm transition-colors disabled:opacity-50"
        >
          <span className={refreshing ? 'animate-spin' : ''}>↻</span>
          {refreshing ? 'Actualisation...' : 'Actualiser'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-zinc-900 border border-zinc-800 rounded-lg p-1 w-fit">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              filter === key
                ? 'bg-zinc-700 text-zinc-100 font-medium'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {label}
            <span className={`ml-1.5 text-xs ${filter === key ? 'text-zinc-400' : 'text-zinc-700'}`}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-5 py-3 text-zinc-500 font-medium">Nom</th>
              <th className="text-left px-5 py-3 text-zinc-500 font-medium">Email</th>
              <th className="text-left px-5 py-3 text-zinc-500 font-medium">Cabinet · Ville</th>
              <th className="text-left px-5 py-3 text-zinc-500 font-medium">Demandé le</th>
              <th className="text-left px-5 py-3 text-zinc-500 font-medium">Statut</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => (
              <>
                <tr
                  key={entry.id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/20 cursor-pointer"
                  onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                >
                  <td className="px-5 py-3 text-zinc-200 font-medium">
                    {entry.firstName} {entry.lastName}
                  </td>
                  <td className="px-5 py-3 text-zinc-400">{entry.email}</td>
                  <td className="px-5 py-3 text-zinc-400">
                    {entry.cabinetName}
                    <span className="text-zinc-600"> · {entry.city}</span>
                  </td>
                  <td className="px-5 py-3 text-zinc-500">
                    {new Date(entry.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusBadge[entry.status]}`}>
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
                            className="text-xs px-3 py-1 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === `approve-${entry.id}` ? '...' : 'Approuver'}
                          </button>
                          <button
                            onClick={() => handleAction(entry.id, 'reject')}
                            disabled={actionLoading !== null}
                            className="text-xs px-3 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === `reject-${entry.id}` ? '...' : 'Refuser'}
                          </button>
                        </>
                      )}
                      {entry.status === 'APPROVED' && (
                        <button
                          onClick={() => handleAction(entry.id, 'resend')}
                          disabled={actionLoading !== null}
                          className="text-xs px-3 py-1 rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === `resend-${entry.id}` ? '...' : 'Renvoyer invitation'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Ligne expandée — message */}
                {expanded === entry.id && (
                  <tr key={`${entry.id}-expanded`} className="border-b border-zinc-800/50 bg-zinc-800/10">
                    <td colSpan={6} className="px-5 py-3">
                      {entry.message ? (
                        <p className="text-zinc-400 text-sm italic">&ldquo;{entry.message}&rdquo;</p>
                      ) : (
                        <p className="text-zinc-600 text-sm">Aucun message.</p>
                      )}
                      {entry.approvedAt && (
                        <p className="text-zinc-600 text-xs mt-1">
                          Approuvé le {new Date(entry.approvedAt).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-zinc-600 text-sm">
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
