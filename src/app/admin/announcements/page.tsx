'use client'

import { useEffect, useState } from 'react'

interface Announcement {
  id: string
  message: string
  type: 'INFO' | 'SUCCESS' | 'WARNING'
  isActive: boolean
  startDate: string | null
  endDate: string | null
  link: string | null
  createdAt: string
}

const TYPES = ['INFO', 'SUCCESS', 'WARNING'] as const

const typeColors: Record<string, string> = {
  INFO: 'bg-blue-500/10 text-blue-400',
  SUCCESS: 'bg-green-500/10 text-green-400',
  WARNING: 'bg-amber-500/10 text-amber-400',
}

function Toggle({
  active,
  disabled,
  onClick,
}: {
  active: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${
        active ? 'bg-green-500' : 'bg-zinc-700'
      } disabled:opacity-50`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
          active ? 'left-5' : 'left-0.5'
        }`}
      />
    </button>
  )
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [form, setForm] = useState({
    message: '',
    type: 'INFO' as 'INFO' | 'SUCCESS' | 'WARNING',
    link: '',
    startDate: '',
    endDate: '',
  })

  useEffect(() => {
    fetch('/api/admin/announcements')
      .then((r) => r.json())
      .then((data) => {
        setAnnouncements(data)
        setLoading(false)
      })
  }, [])

  async function createAnnouncement() {
    if (!form.message.trim()) return
    setCreating(true)
    const res = await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: form.message,
        type: form.type,
        link: form.link || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      }),
    })
    if (res.ok) {
      const created = await res.json()
      setAnnouncements((prev) => [created, ...prev])
      setForm({ message: '', type: 'INFO', link: '', startDate: '', endDate: '' })
    }
    setCreating(false)
  }

  async function toggleActive(a: Announcement) {
    setActionLoading(`toggle-${a.id}`)
    const res = await fetch(`/api/admin/announcements/${a.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !a.isActive }),
    })
    if (res.ok) {
      setAnnouncements((prev) =>
        prev.map((item) => (item.id === a.id ? { ...item, isActive: !a.isActive } : item))
      )
    }
    setActionLoading(null)
  }

  async function deleteAnnouncement(id: string) {
    setActionLoading(`delete-${id}`)
    const res = await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id))
    }
    setActionLoading(null)
  }

  if (loading) {
    return <div className="p-8 text-zinc-400">Chargement...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-zinc-100 mb-8">Annonces</h1>

      {/* Create form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
        <h2 className="text-base font-semibold text-zinc-200 mb-4">Nouvelle annonce</h2>
        <div className="space-y-3">
          <textarea
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            placeholder="Message de l'annonce..."
            rows={3}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 resize-none"
          />
          <div className="flex gap-3 flex-wrap">
            <select
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  type: e.target.value as 'INFO' | 'SUCCESS' | 'WARNING',
                }))
              }
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={form.link}
              onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
              placeholder="Lien (optionnel)"
              className="flex-1 min-w-48 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
            />
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={createAnnouncement}
              disabled={creating || !form.message.trim()}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {creating ? 'Création...' : "Créer l'annonce"}
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      {announcements.length === 0 ? (
        <div className="text-zinc-500 text-sm">Aucune annonce.</div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-start gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${typeColors[a.type]}`}
                  >
                    {a.type}
                  </span>
                  {!a.isActive && (
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-500">
                      Inactif
                    </span>
                  )}
                  {(a.startDate || a.endDate) && (
                    <span className="text-xs text-zinc-600">
                      {a.startDate && new Date(a.startDate).toLocaleDateString('fr-FR')}
                      {a.startDate && a.endDate && ' → '}
                      {a.endDate && new Date(a.endDate).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
                <p className="text-zinc-200 text-sm">{a.message}</p>
                {a.link && <p className="text-zinc-500 text-xs mt-1 truncate">→ {a.link}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Toggle
                  active={a.isActive}
                  disabled={actionLoading === `toggle-${a.id}`}
                  onClick={() => toggleActive(a)}
                />
                <button
                  onClick={() => deleteAnnouncement(a.id)}
                  disabled={actionLoading === `delete-${a.id}`}
                  className="text-xs px-3 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  {actionLoading === `delete-${a.id}` ? '...' : 'Supprimer'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
