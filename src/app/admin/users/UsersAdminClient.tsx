'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface AdminUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  createdAt: string
  lastSeenAt: string | null
  suspended: boolean
  freeAccess: boolean
  agency: { name: string; plan: string } | null
  projectCount: number
  aoCount: number
}

const ADMIN_RED = '#DC2626'

function PlanBadge({ plan }: { plan: string }) {
  const colors = {
    SOLO: { bg: 'var(--surface2)', color: 'var(--text3)' },
    STUDIO: { bg: '#EEF2FF', color: '#4338CA' },
    AGENCY: { bg: '#F0FDF4', color: '#166534' },
  }
  const c = colors[plan as keyof typeof colors] ?? colors.SOLO
  return (
    <Badge style={{ background: c.bg, color: c.color, border: 'none', fontSize: '11px' }}>
      {plan}
    </Badge>
  )
}

export function UsersAdminClient() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)

  const fetchUsers = useCallback(async (q = '') => {
    setLoading(true)
    const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`)
    const data = await res.json() as AdminUser[]
    setUsers(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    const t = setTimeout(() => { void fetchUsers(search) }, 300)
    return () => clearTimeout(t)
  }, [search, fetchUsers])

  async function handleSuspend(id: string) {
    setLoadingId(id)
    await fetch(`/api/admin/users/${id}/suspend`, { method: 'PATCH' })
    setUsers(prev => prev.map(u => u.id === id ? { ...u, suspended: true } : u))
    setLoadingId(null)
  }

  async function handleReactivate(id: string) {
    setLoadingId(id)
    await fetch(`/api/admin/users/${id}/reactivate`, { method: 'PATCH' })
    setUsers(prev => prev.map(u => u.id === id ? { ...u, suspended: false } : u))
    setLoadingId(null)
  }

  async function handleImpersonate(id: string, email: string) {
    setLoadingId(id)
    const res = await fetch(`/api/admin/users/${id}/impersonate`, { method: 'POST' })
    const data = await res.json() as { url?: string; error?: string }
    setLoadingId(null)
    if (data.url) {
      window.open(data.url, '_blank', 'noopener')
    } else {
      alert(`Erreur impersonation ${email}: ${data.error ?? 'inconnue'}`)
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Utilisateurs</h1>
          <p className="text-sm" style={{ color: 'var(--text3)' }}>{users.length} architecte{users.length > 1 ? 's' : ''} inscrits</p>
        </div>
        <Input
          placeholder="Rechercher par nom ou email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-64"
          style={{ borderColor: 'var(--border)' }}
        />
      </div>

      <div
        className="rounded-[var(--radius-lg)] overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        {loading ? (
          <div className="py-16 text-center" style={{ color: 'var(--text3)' }}>Chargement...</div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center" style={{ color: 'var(--text3)' }}>Aucun utilisateur trouvé</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text2)' }}>Nom</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text2)' }}>Cabinet</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text2)' }}>Plan</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text2)' }}>Projets</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text2)' }}>AO</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text2)' }}>Inscrit</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text2)' }}>Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <tr
                  key={user.id}
                  style={{ borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium" style={{ color: 'var(--text)' }}>
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text3)' }}>{user.email}</p>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text2)' }}>
                    {user.agency?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {user.agency ? <PlanBadge plan={user.agency.plan} /> : '—'}
                    {user.freeAccess && (
                      <Badge className="ml-1" style={{ background: '#FEF3C7', color: '#92400E', border: 'none', fontSize: '10px' }}>
                        Gratuit
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center" style={{ color: 'var(--text2)' }}>{user.projectCount}</td>
                  <td className="px-4 py-3 text-center" style={{ color: 'var(--text2)' }}>{user.aoCount}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text3)' }}>
                    {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    {user.suspended ? (
                      <Badge style={{ background: '#FEF2F2', color: ADMIN_RED, border: 'none' }}>Suspendu</Badge>
                    ) : (
                      <Badge style={{ background: 'var(--green-light)', color: 'var(--green)', border: 'none' }}>Actif</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedUser(user)}
                        style={{ fontSize: '11px', height: '26px', padding: '0 8px', borderColor: 'var(--border2)' }}
                      >
                        Profil
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loadingId === user.id}
                        onClick={() => void handleImpersonate(user.id, user.email)}
                        style={{ fontSize: '11px', height: '26px', padding: '0 8px', borderColor: 'var(--border2)' }}
                      >
                        Se connecter en tant que
                      </Button>
                      {user.suspended ? (
                        <Button
                          size="sm"
                          disabled={loadingId === user.id}
                          onClick={() => void handleReactivate(user.id)}
                          style={{ fontSize: '11px', height: '26px', padding: '0 8px', background: 'var(--green-btn)', color: '#fff', border: 'none' }}
                        >
                          Réactiver
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={loadingId === user.id}
                          onClick={() => void handleSuspend(user.id)}
                          style={{ fontSize: '11px', height: '26px', padding: '0 8px', background: ADMIN_RED, color: '#fff', border: 'none' }}
                        >
                          Suspendre
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Panel profil latéral */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex"
          onClick={() => setSelectedUser(null)}
        >
          <div className="flex-1 bg-black/20" />
          <div
            className="w-80 h-full flex flex-col p-6 overflow-y-auto"
            style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold" style={{ color: 'var(--text)' }}>Profil utilisateur</h2>
              <button onClick={() => setSelectedUser(null)} style={{ color: 'var(--text3)' }}>✕</button>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <p style={{ color: 'var(--text3)' }}>Nom complet</p>
                <p className="font-medium" style={{ color: 'var(--text)' }}>
                  {selectedUser.firstName} {selectedUser.lastName}
                </p>
              </div>
              <div>
                <p style={{ color: 'var(--text3)' }}>Email</p>
                <p style={{ color: 'var(--text)' }}>{selectedUser.email}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text3)' }}>Cabinet</p>
                <p style={{ color: 'var(--text)' }}>{selectedUser.agency?.name ?? '—'}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text3)' }}>Plan</p>
                <p style={{ color: 'var(--text)' }}>{selectedUser.agency?.plan ?? '—'}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text3)' }}>Projets / AO</p>
                <p style={{ color: 'var(--text)' }}>{selectedUser.projectCount} projets · {selectedUser.aoCount} AO</p>
              </div>
              <div>
                <p style={{ color: 'var(--text3)' }}>Inscrit le</p>
                <p style={{ color: 'var(--text)' }}>
                  {new Date(selectedUser.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p style={{ color: 'var(--text3)' }}>Dernière connexion</p>
                <p style={{ color: 'var(--text)' }}>
                  {selectedUser.lastSeenAt
                    ? new Date(selectedUser.lastSeenAt).toLocaleDateString('fr-FR')
                    : '—'}
                </p>
              </div>
              <div>
                <p style={{ color: 'var(--text3)' }}>Accès gratuit</p>
                <p style={{ color: 'var(--text)' }}>{selectedUser.freeAccess ? 'Oui' : 'Non'}</p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <Button
                className="w-full"
                size="sm"
                variant="outline"
                onClick={() => {
                  void (async () => {
                    const newVal = !selectedUser.freeAccess
                    await fetch(`/api/admin/users/${selectedUser.id}/free-access`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ freeAccess: newVal }),
                    })
                    setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, freeAccess: newVal } : u))
                    setSelectedUser(prev => prev ? { ...prev, freeAccess: newVal } : null)
                  })()
                }}
                style={{ borderColor: 'var(--border2)', fontSize: '12px' }}
              >
                {selectedUser.freeAccess ? 'Retirer l\'accès gratuit' : 'Accorder accès gratuit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
