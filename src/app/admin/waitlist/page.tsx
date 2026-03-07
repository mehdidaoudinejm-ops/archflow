'use client'

import { useEffect, useState } from 'react'

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
}

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
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/waitlist')
      .then((r) => r.json())
      .then((data) => {
        setEntries(data)
        setLoading(false)
      })
  }, [])

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setActionLoading(`${action}-${id}`)
    const res = await fetch(`/api/admin/waitlist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      const status = action === 'approve' ? 'APPROVED' : 'REJECTED'
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)))
    }
    setActionLoading(null)
  }

  if (loading) {
    return <div className="p-8 text-zinc-400">Chargement...</div>
  }

  const pending = entries.filter((e) => e.status === 'PENDING')

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-zinc-100 mb-2">Liste d&apos;attente</h1>
      <p className="text-zinc-500 text-sm mb-8">
        {pending.length} en attente · {entries.length} total
      </p>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-5 py-3 text-zinc-500 font-medium">Nom</th>
              <th className="text-left px-5 py-3 text-zinc-500 font-medium">Email</th>
              <th className="text-left px-5 py-3 text-zinc-500 font-medium">Cabinet</th>
              <th className="text-left px-5 py-3 text-zinc-500 font-medium">Ville</th>
              <th className="text-left px-5 py-3 text-zinc-500 font-medium">Date</th>
              <th className="text-left px-5 py-3 text-zinc-500 font-medium">Statut</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                <td className="px-5 py-3 text-zinc-200">
                  {entry.firstName} {entry.lastName}
                </td>
                <td className="px-5 py-3 text-zinc-400">{entry.email}</td>
                <td className="px-5 py-3 text-zinc-400">{entry.cabinetName}</td>
                <td className="px-5 py-3 text-zinc-400">{entry.city}</td>
                <td className="px-5 py-3 text-zinc-500">
                  {new Date(entry.createdAt).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${statusBadge[entry.status]}`}
                  >
                    {statusLabel[entry.status]}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {entry.status === 'PENDING' && (
                    <div className="flex gap-2">
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
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-zinc-500 text-sm">
                  Aucune demande
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
