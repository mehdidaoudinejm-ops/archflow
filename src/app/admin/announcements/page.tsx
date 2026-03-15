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

const typeStyle: Record<string, { bg: string; color: string }> = {
  INFO:    { bg: '#EEF2FF', color: '#4338CA' },
  SUCCESS: { bg: '#EAF3ED', color: '#1A5C3A' },
  WARNING: { bg: '#FEF3E2', color: '#B45309' },
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
      className="w-10 h-5 rounded-full transition-colors relative shrink-0 disabled:opacity-50"
      style={{ background: active ? '#1A5C3A' : '#D4D4CC' }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
        style={{ left: active ? '1.25rem' : '0.125rem' }}
      />
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#F8F8F6',
  border: '1px solid #E8E8E3',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 14,
  color: '#1A1A18',
  outline: 'none',
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
    return <div className="p-8 text-sm" style={{ color: '#9B9B94' }}>Chargement...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#1A1A18' }}>Annonces</h1>
      <p className="text-sm mb-8" style={{ color: '#6B6B65' }}>Bannières affichées aux utilisateurs de l&apos;app</p>

      {/* Formulaire création */}
      <div
        className="rounded-[14px] p-6 mb-8"
        style={{ background: '#fff', border: '1px solid #E8E8E3', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#1A1A18' }}>Nouvelle annonce</h2>
        <div className="space-y-3">
          <textarea
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            placeholder="Message de l'annonce..."
            rows={3}
            style={{ ...inputStyle, resize: 'none' }}
          />
          <div className="flex gap-3 flex-wrap">
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'INFO' | 'SUCCESS' | 'WARNING' }))}
              style={{ ...inputStyle, width: 'auto' }}
            >
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              type="text"
              value={form.link}
              onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
              placeholder="Lien (optionnel)"
              style={{ ...inputStyle, flex: 1, minWidth: 192 }}
            />
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              style={{ ...inputStyle, width: 'auto' }}
            />
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              style={{ ...inputStyle, width: 'auto' }}
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={createAnnouncement}
              disabled={creating || !form.message.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{ background: 'var(--green)', color: '#fff' }}
            >
              {creating ? 'Création...' : "Créer l'annonce"}
            </button>
          </div>
        </div>
      </div>

      {/* Liste */}
      {announcements.length === 0 ? (
        <div className="text-sm" style={{ color: '#9B9B94' }}>Aucune annonce.</div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => {
            const ts = typeStyle[a.type] ?? typeStyle.INFO
            return (
              <div
                key={a.id}
                className="rounded-[14px] p-5 flex items-start gap-4"
                style={{ background: '#fff', border: '1px solid #E8E8E3', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded font-medium"
                      style={{ background: ts.bg, color: ts.color }}
                    >
                      {a.type}
                    </span>
                    {!a.isActive && (
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ background: '#F3F4F6', color: '#9B9B94' }}
                      >
                        Inactif
                      </span>
                    )}
                    {(a.startDate || a.endDate) && (
                      <span className="text-xs" style={{ color: '#9B9B94' }}>
                        {a.startDate && new Date(a.startDate).toLocaleDateString('fr-FR')}
                        {a.startDate && a.endDate && ' → '}
                        {a.endDate && new Date(a.endDate).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: '#1A1A18' }}>{a.message}</p>
                  {a.link && <p className="text-xs mt-1 truncate" style={{ color: '#9B9B94' }}>→ {a.link}</p>}
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
                    className="text-xs px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                    style={{ background: '#FEE8E8', color: '#9B1C1C', border: '1px solid #FCA5A5' }}
                  >
                    {actionLoading === `delete-${a.id}` ? '...' : 'Supprimer'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
