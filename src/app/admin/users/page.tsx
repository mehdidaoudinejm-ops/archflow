'use client'

import { useEffect, useRef, useState } from 'react'

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string
  suspended: boolean
  freeAccess: boolean
  aiImportCount: number
  aiImportLimit: number
  lastSeenAt: string | null
  createdAt: string
  agency: { name: string } | null
}

const roleColors: Record<string, string> = {
  ARCHITECT: 'bg-blue-500/10 text-blue-400',
  COLLABORATOR: 'bg-purple-500/10 text-purple-400',
  COMPANY: 'bg-amber-500/10 text-amber-400',
  CLIENT: 'bg-green-500/10 text-green-400',
  ADMIN: 'bg-red-500/10 text-red-400',
}

function Toggle({
  active,
  color,
  disabled,
  onClick,
}: {
  active: boolean
  color: 'red' | 'green'
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${
        active
          ? color === 'red'
            ? 'bg-red-500'
            : 'bg-green-500'
          : 'bg-zinc-700'
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

function ImportLimitCell({ user, onUpdate }: { user: User; onUpdate: (id: string, limit: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(user.aiImportLimit))
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const ratio = user.aiImportCount / user.aiImportLimit
  const badgeColor =
    user.aiImportCount >= user.aiImportLimit
      ? 'text-red-400 bg-red-500/10'
      : ratio >= 0.8
      ? 'text-amber-400 bg-amber-500/10'
      : 'text-emerald-400 bg-emerald-500/10'

  function startEdit() {
    setValue(String(user.aiImportLimit))
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  async function save() {
    const parsed = parseInt(value, 10)
    if (isNaN(parsed) || parsed < 0) { setEditing(false); return }
    setSaving(true)
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiImportLimit: parsed }),
    })
    if (res.ok) onUpdate(user.id, parsed)
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-zinc-500 text-xs">{user.aiImportCount} /</span>
        <input
          ref={inputRef}
          type="number"
          min={0}
          max={9999}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') setEditing(false) }}
          className="w-14 text-xs px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-600 text-zinc-100 focus:outline-none focus:border-zinc-400"
        />
        <button
          onClick={() => void save()}
          disabled={saving}
          className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
        >
          {saving ? '…' : '✓'}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${badgeColor}`}>
        {user.aiImportCount} / {user.aiImportLimit}
      </span>
      <button
        onClick={startEdit}
        className="text-zinc-600 hover:text-zinc-300 transition-colors text-xs"
        title="Modifier la limite"
      >
        ✎
      </button>
    </div>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((data) => {
        setUsers(data)
        setLoading(false)
      })
  }, [])

  async function toggleSuspend(user: User) {
    setActionLoading(`suspend-${user.id}`)
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspended: !user.suspended }),
    })
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, suspended: !u.suspended } : u))
      )
    }
    setActionLoading(null)
  }

  async function toggleFreeAccess(user: User) {
    setActionLoading(`free-${user.id}`)
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ freeAccess: !user.freeAccess }),
    })
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, freeAccess: !u.freeAccess } : u))
      )
    }
    setActionLoading(null)
  }

  async function deleteUser(user: User) {
    if (!window.confirm(`Supprimer définitivement ${user.email} ? Cette action est irréversible.`)) return
    setActionLoading(`del-${user.id}`)
    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
    }
    setActionLoading(null)
  }

  function updateImportLimit(id: string, limit: number) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, aiImportLimit: limit } : u)))
  }

  async function impersonate(user: User) {
    setActionLoading(`imp-${user.id}`)
    const res = await fetch(`/api/admin/users/${user.id}/impersonate`, { method: 'POST' })
    if (res.ok) {
      const { url } = await res.json()
      const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
      localStorage.setItem('__adminImpersonating', JSON.stringify({ email: user.email, name: displayName }))
      window.open(url, '_blank', 'noopener')
    }
    setActionLoading(null)
  }

  if (loading) {
    return <div className="p-8 text-zinc-400">Chargement...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-zinc-100 mb-2">Utilisateurs</h1>
      <p className="text-zinc-500 text-sm mb-8">
        {users.length} utilisateur{users.length > 1 ? 's' : ''}
      </p>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-5 py-3 text-zinc-500 font-medium">Utilisateur</th>
              <th className="text-left px-5 py-3 text-zinc-500 font-medium">Rôle</th>
              <th className="text-left px-5 py-3 text-zinc-500 font-medium">Agence</th>
              <th className="text-left px-5 py-3 text-zinc-500 font-medium">Inscrit le</th>
              <th className="text-center px-5 py-3 text-zinc-500 font-medium">Suspendu</th>
              <th className="text-center px-5 py-3 text-zinc-500 font-medium">Accès gratuit</th>
              <th className="text-left px-5 py-3 text-zinc-500 font-medium">Imports IA</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                <td className="px-5 py-3">
                  <div className="text-zinc-200">{user.email}</div>
                  {(user.firstName || user.lastName) && (
                    <div className="text-zinc-500 text-xs">
                      {[user.firstName, user.lastName].filter(Boolean).join(' ')}
                    </div>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${roleColors[user.role] ?? 'bg-zinc-700 text-zinc-300'}`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-5 py-3 text-zinc-400">{user.agency?.name ?? '—'}</td>
                <td className="px-5 py-3 text-zinc-500">
                  {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-5 py-3 flex justify-center">
                  <Toggle
                    active={user.suspended}
                    color="red"
                    disabled={actionLoading === `suspend-${user.id}`}
                    onClick={() => toggleSuspend(user)}
                  />
                </td>
                <td className="px-5 py-3 text-center">
                  <div className="flex justify-center">
                    <Toggle
                      active={user.freeAccess}
                      color="green"
                      disabled={actionLoading === `free-${user.id}`}
                      onClick={() => toggleFreeAccess(user)}
                    />
                  </div>
                </td>
                <td className="px-5 py-3">
                  <ImportLimitCell user={user} onUpdate={updateImportLimit} />
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => impersonate(user)}
                      disabled={actionLoading !== null}
                      className="text-xs px-3 py-1 rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {actionLoading === `imp-${user.id}` ? '...' : 'Voir en tant que'}
                    </button>
                    <button
                      onClick={() => deleteUser(user)}
                      disabled={actionLoading !== null}
                      className="text-xs px-3 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {actionLoading === `del-${user.id}` ? '...' : 'Supprimer'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
