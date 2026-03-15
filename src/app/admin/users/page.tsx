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
  agencyId: string | null
  agency: { id: string; name: string; plan: string } | null
}

const ROLES = ['ARCHITECT', 'COLLABORATOR', 'COMPANY', 'CLIENT', 'ADMIN'] as const
const PLANS = ['SOLO', 'STUDIO', 'AGENCY'] as const

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  ARCHITECT:    { bg: '#EAF3ED', color: '#1A5C3A' },
  COLLABORATOR: { bg: '#EEF2FF', color: '#4338CA' },
  COMPANY:      { bg: '#FEF3E2', color: '#B45309' },
  CLIENT:       { bg: '#F3F4F6', color: '#6B7280' },
  ADMIN:        { bg: '#FEE8E8', color: '#9B1C1C' },
}

const PLAN_STYLE: Record<string, { bg: string; color: string }> = {
  SOLO:   { bg: '#F3F4F6', color: '#6B7280' },
  STUDIO: { bg: '#EEF2FF', color: '#4338CA' },
  AGENCY: { bg: '#EAF3ED', color: '#1A5C3A' },
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
  const activeColor = color === 'red' ? '#EF4444' : '#1A5C3A'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-10 h-5 rounded-full transition-colors relative shrink-0 disabled:opacity-50"
      style={{ background: active ? activeColor : '#D4D4CC' }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
        style={{ left: active ? '1.25rem' : '0.125rem' }}
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
  const badgeStyle =
    user.aiImportCount >= user.aiImportLimit
      ? { background: '#FEE8E8', color: '#9B1C1C' }
      : ratio >= 0.8
      ? { background: '#FEF3E2', color: '#B45309' }
      : { background: '#EAF3ED', color: '#1A5C3A' }

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
        <span className="text-xs" style={{ color: '#9B9B94' }}>{user.aiImportCount} /</span>
        <input
          ref={inputRef}
          type="number"
          min={0}
          max={9999}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') setEditing(false) }}
          className="w-14 text-xs px-1.5 py-0.5 rounded focus:outline-none"
          style={{ background: '#F8F8F6', border: '1px solid #D4D4CC', color: '#1A1A18' }}
        />
        <button
          onClick={() => void save()}
          disabled={saving}
          className="text-xs px-1.5 py-0.5 rounded disabled:opacity-50"
          style={{ background: '#EAF3ED', color: '#1A5C3A' }}
        >
          {saving ? '…' : '✓'}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="text-xs px-1.5 py-0.5 rounded"
          style={{ background: '#F3F4F6', color: '#6B6B65' }}
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs px-2 py-0.5 rounded font-mono font-medium" style={badgeStyle}>
        {user.aiImportCount} / {user.aiImportLimit}
      </span>
      <button
        onClick={startEdit}
        className="text-xs transition-colors"
        style={{ color: '#9B9B94' }}
        title="Modifier la limite"
      >
        ✎
      </button>
    </div>
  )
}

const ROLE_FILTER_LABELS: Record<string, string> = {
  ALL: 'Tous',
  ARCHITECT: 'Architectes',
  COLLABORATOR: 'Collaborateurs',
  COMPANY: 'Entreprises',
  CLIENT: 'Clients',
  ADMIN: 'Admins',
}

const AI_IMPORT_ROLES = ['ARCHITECT', 'COLLABORATOR', 'ADMIN']

interface CheckResult {
  email: string
  prisma: { exists: boolean; id?: string; role?: string }
  supabase: { exists: boolean; id?: string }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<string>('ALL')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState('')
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null)
  const [checkLoading, setCheckLoading] = useState(false)

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
    setErrorMsg(null)
    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
      if (data.warning) setErrorMsg(`⚠️ ${data.warning}`)
    } else {
      setErrorMsg(data.error ?? `Erreur lors de la suppression de ${user.email}`)
    }
    setActionLoading(null)
  }

  async function checkUser() {
    if (!checkEmail.trim()) return
    setCheckLoading(true)
    setCheckResult(null)
    const res = await fetch(`/api/admin/users/sync?email=${encodeURIComponent(checkEmail.trim())}`)
    const data = await res.json()
    setCheckResult(data)
    setCheckLoading(false)
  }

  async function forceDelete(email: string) {
    if (!window.confirm(`Supprimer définitivement "${email}" de Prisma ET Supabase Auth ?`)) return
    setCheckLoading(true)
    const res = await fetch('/api/admin/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    if (res.ok) {
      setSyncMsg(`Prisma: ${data.results.prisma} · Supabase: ${data.results.supabase}`)
      setCheckResult(null)
      setCheckEmail('')
      // Recharger la liste
      fetch('/api/admin/users').then((r) => r.json()).then(setUsers)
    } else {
      setErrorMsg(data.error ?? 'Erreur lors de la suppression forcée')
    }
    setCheckLoading(false)
  }

  async function purgeOrphans() {
    if (!window.confirm('Supprimer tous les utilisateurs Prisma sans compte Supabase Auth (orphelins) ? Cette action est irréversible.')) return
    setSyncMsg(null)
    setErrorMsg(null)
    // Afficher un aperçu d'abord
    const preview = await fetch('/api/admin/users/sync').then((r) => r.json())
    if (preview.orphans?.length === 0) {
      setSyncMsg('Aucun orphelin trouvé — base de données déjà synchronisée.')
      return
    }
    const emails = (preview.orphans as { email: string }[]).map((o) => o.email).join(', ')
    if (!window.confirm(`${preview.orphans.length} orphelin(s) trouvé(s) :\n${emails}\n\nConfirmer la suppression ?`)) return
    const res = await fetch('/api/admin/users/sync', { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) {
      setSyncMsg(`${data.deleted} orphelin(s) supprimé(s).`)
      // Recharger la liste
      fetch('/api/admin/users').then((r) => r.json()).then(setUsers)
    } else {
      setErrorMsg(data.error ?? 'Erreur lors de la synchronisation')
    }
  }

  function updateImportLimit(id: string, limit: number) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, aiImportLimit: limit } : u)))
  }

  async function changeRole(user: User, role: string) {
    setActionLoading(`role-${user.id}`)
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role } : u)))
    }
    setActionLoading(null)
  }

  async function changePlan(user: User, plan: string) {
    if (!user.agency) return
    setActionLoading(`plan-${user.id}`)
    const res = await fetch(`/api/admin/agencies/${user.agency.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) =>
          u.agencyId === user.agencyId && u.agency
            ? { ...u, agency: { ...u.agency, plan } }
            : u
        )
      )
    }
    setActionLoading(null)
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
    return <div className="p-8" style={{ color: '#9B9B94' }}>Chargement...</div>
  }

  const filteredUsers = roleFilter === 'ALL' ? users : users.filter((u) => u.role === roleFilter)
  const showAiImport = roleFilter === 'ALL' || AI_IMPORT_ROLES.includes(roleFilter)

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold" style={{ color: '#1A1A18' }}>Utilisateurs</h1>
        <button
          onClick={() => void purgeOrphans()}
          className="text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: '#FEF3E2', color: '#B45309', border: '1px solid #FCD34D' }}
          title="Supprimer les utilisateurs Prisma sans compte Supabase Auth"
        >
          Purger les orphelins
        </button>
      </div>
      <p className="text-sm mb-4" style={{ color: '#6B6B65' }}>
        {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''}
        {roleFilter !== 'ALL' && <span style={{ color: '#9B9B94' }}> · filtre : {ROLE_FILTER_LABELS[roleFilter]}</span>}
      </p>

      {errorMsg && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: '#FEE8E8', color: '#9B1C1C', border: '1px solid #FCA5A5' }}>
          {errorMsg}
          <button onClick={() => setErrorMsg(null)} className="ml-3 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}
      {syncMsg && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: '#EAF3ED', color: '#1A5C3A', border: '1px solid #86EFAC' }}>
          {syncMsg}
          <button onClick={() => setSyncMsg(null)} className="ml-3 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Vérificateur Prisma / Supabase */}
      <div className="mb-5 p-4 rounded-[14px]" style={{ background: '#F8F8F6', border: '1px solid #E8E8E3' }}>
        <p className="text-xs font-medium mb-2" style={{ color: '#6B6B65' }}>Vérifier l&apos;état d&apos;un compte (Prisma + Supabase Auth)</p>
        <div className="flex gap-2">
          <input
            type="email"
            value={checkEmail}
            onChange={(e) => setCheckEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void checkUser() }}
            placeholder="email@exemple.fr"
            className="flex-1 text-sm px-3 py-1.5 rounded-lg focus:outline-none"
            style={{ background: '#fff', border: '1px solid #D4D4CC', color: '#1A1A18' }}
          />
          <button
            onClick={() => void checkUser()}
            disabled={checkLoading || !checkEmail.trim()}
            className="text-sm px-4 py-1.5 rounded-lg disabled:opacity-50"
            style={{ background: '#1A1A18', color: '#fff' }}
          >
            {checkLoading ? '...' : 'Vérifier'}
          </button>
        </div>

        {checkResult && (
          <div className="mt-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs">
              <span style={{ color: '#6B6B65', width: 80 }}>Prisma</span>
              {checkResult.prisma.exists
                ? <span className="px-2 py-0.5 rounded font-medium" style={{ background: '#EAF3ED', color: '#1A5C3A' }}>
                    ✓ Existe — rôle : {checkResult.prisma.role}
                  </span>
                : <span className="px-2 py-0.5 rounded font-medium" style={{ background: '#F3F4F6', color: '#9B9B94' }}>
                    ✗ Absent
                  </span>
              }
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span style={{ color: '#6B6B65', width: 80 }}>Supabase</span>
              {checkResult.supabase.exists
                ? <span className="px-2 py-0.5 rounded font-medium" style={{ background: '#EAF3ED', color: '#1A5C3A' }}>
                    ✓ Existe — id : {checkResult.supabase.id}
                  </span>
                : <span className="px-2 py-0.5 rounded font-medium" style={{ background: '#F3F4F6', color: '#9B9B94' }}>
                    ✗ Absent
                  </span>
              }
            </div>
            {(checkResult.prisma.exists || checkResult.supabase.exists) && (
              <button
                onClick={() => void forceDelete(checkResult.email)}
                disabled={checkLoading}
                className="mt-1 self-start text-xs px-3 py-1.5 rounded-lg disabled:opacity-50"
                style={{ background: '#FEE8E8', color: '#9B1C1C', border: '1px solid #FCA5A5' }}
              >
                Supprimer définitivement des deux systèmes
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filtres par rôle */}
      <div className="flex flex-wrap gap-2 mb-5">
        {Object.entries(ROLE_FILTER_LABELS).map(([role, label]) => {
          const count = role === 'ALL' ? users.length : users.filter((u) => u.role === role).length
          const active = roleFilter === role
          return (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{
                background: active ? '#1A1A18' : '#F3F4F6',
                color: active ? '#fff' : '#6B6B65',
                border: `1px solid ${active ? '#1A1A18' : '#E8E8E3'}`,
              }}
            >
              {label} <span style={{ opacity: 0.6 }}>({count})</span>
            </button>
          )
        })}
      </div>

      <div className="rounded-[14px] overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E8E3', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #E8E8E3' }}>
                {['Utilisateur', 'Rôle', 'Agence / Plan', 'Inscrit le', 'Suspendu', 'Gratuit', ...(showAiImport ? ['Imports IA'] : []), ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#6B6B65', fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, i) => (
                <tr key={user.id} style={{ borderBottom: i < filteredUsers.length - 1 ? '1px solid #E8E8E3' : undefined }}>

                  {/* Utilisateur */}
                  <td className="px-4 py-3">
                    <div className="font-medium" style={{ color: '#1A1A18' }}>{user.email}</div>
                    {(user.firstName || user.lastName) && (
                      <div className="text-xs" style={{ color: '#9B9B94' }}>
                        {[user.firstName, user.lastName].filter(Boolean).join(' ')}
                      </div>
                    )}
                  </td>

                  {/* Rôle — select inline */}
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      disabled={actionLoading === `role-${user.id}`}
                      onChange={(e) => changeRole(user, e.target.value)}
                      style={{
                        fontSize: 12, fontWeight: 600, borderRadius: 6,
                        padding: '3px 8px', border: '1px solid #E8E8E3',
                        background: ROLE_STYLE[user.role]?.bg ?? '#F3F4F6',
                        color: ROLE_STYLE[user.role]?.color ?? '#6B7280',
                        cursor: 'pointer', appearance: 'auto',
                      }}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>

                  {/* Agence + Plan — select plan inline */}
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium" style={{ color: '#1A1A18' }}>{user.agency?.name ?? '—'}</div>
                    {user.agency && (
                      <select
                        value={user.agency.plan}
                        disabled={actionLoading === `plan-${user.id}`}
                        onChange={(e) => changePlan(user, e.target.value)}
                        style={{
                          marginTop: 3, fontSize: 11, fontWeight: 600, borderRadius: 5,
                          padding: '2px 6px', border: '1px solid #E8E8E3',
                          background: PLAN_STYLE[user.agency.plan]?.bg ?? '#F3F4F6',
                          color: PLAN_STYLE[user.agency.plan]?.color ?? '#6B7280',
                          cursor: 'pointer', appearance: 'auto',
                        }}
                      >
                        {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    )}
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-xs" style={{ color: '#9B9B94' }}>
                    {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                  </td>

                  {/* Suspendu */}
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <Toggle
                        active={user.suspended}
                        color="red"
                        disabled={actionLoading === `suspend-${user.id}`}
                        onClick={() => toggleSuspend(user)}
                      />
                    </div>
                  </td>

                  {/* Accès gratuit */}
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <Toggle
                        active={user.freeAccess}
                        color="green"
                        disabled={actionLoading === `free-${user.id}`}
                        onClick={() => toggleFreeAccess(user)}
                      />
                    </div>
                  </td>

                  {/* Imports IA — masqué pour COMPANY et CLIENT */}
                  {showAiImport && (
                    <td className="px-4 py-3">
                      {AI_IMPORT_ROLES.includes(user.role)
                        ? <ImportLimitCell user={user} onUpdate={updateImportLimit} />
                        : <span style={{ color: '#9B9B94', fontSize: 12 }}>—</span>
                      }
                    </td>
                  )}

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => impersonate(user)}
                        disabled={actionLoading !== null}
                        className="text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                        style={{ background: '#F3F4F6', color: '#6B6B65', border: '1px solid #E8E8E3' }}
                      >
                        {actionLoading === `imp-${user.id}` ? '...' : 'Voir en tant que'}
                      </button>
                      <button
                        onClick={() => deleteUser(user)}
                        disabled={actionLoading !== null}
                        className="text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                        style={{ background: '#FEE8E8', color: '#9B1C1C', border: '1px solid #FCA5A5' }}
                      >
                        {actionLoading === `del-${user.id}` ? '...' : 'Supprimer'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm" style={{ color: '#9B9B94' }}>
                    Aucun utilisateur{roleFilter !== 'ALL' ? ` avec le rôle ${ROLE_FILTER_LABELS[roleFilter]}` : ''}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
