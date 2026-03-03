'use client'

import { useEffect, useState } from 'react'
import type { WaitlistEntry } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Filter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

const ADMIN_RED = '#DC2626'

export function WaitlistAdminClient() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('PENDING')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [showDirectCreate, setShowDirectCreate] = useState(false)
  const [directForm, setDirectForm] = useState({ firstName: '', lastName: '', email: '', agencyName: '' })
  const [directSaving, setDirectSaving] = useState(false)
  const [directResult, setDirectResult] = useState<{ password?: string; error?: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/waitlist')
      .then(r => r.json())
      .then((d: WaitlistEntry[]) => setEntries(d))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'ALL' ? entries : entries.filter(e => e.status === filter)
  const counts = {
    ALL: entries.length,
    PENDING: entries.filter(e => e.status === 'PENDING').length,
    APPROVED: entries.filter(e => e.status === 'APPROVED').length,
    REJECTED: entries.filter(e => e.status === 'REJECTED').length,
  }

  async function handleApprove(id: string) {
    setLoadingId(id)
    const res = await fetch(`/api/admin/waitlist/${id}/approve`, { method: 'PATCH' })
    if (res.ok) {
      setEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'APPROVED' as const, approvedAt: new Date() } : e))
    }
    setLoadingId(null)
  }

  async function handleReject(id: string) {
    setLoadingId(id)
    const res = await fetch(`/api/admin/waitlist/${id}/reject`, { method: 'PATCH' })
    if (res.ok) {
      setEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'REJECTED' as const } : e))
    }
    setLoadingId(null)
  }

  async function handleDirectCreate(e: React.FormEvent) {
    e.preventDefault()
    setDirectSaving(true)
    setDirectResult(null)
    const res = await fetch('/api/admin/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(directForm),
    })
    const data = await res.json() as { tempPassword?: string; error?: string }
    if (res.ok) {
      setDirectResult({ password: data.tempPassword })
      setDirectForm({ firstName: '', lastName: '', email: '', agencyName: '' })
    } else {
      setDirectResult({ error: data.error })
    }
    setDirectSaving(false)
  }

  function statusBadge(status: WaitlistEntry['status']) {
    if (status === 'PENDING') return <Badge style={{ background: 'var(--amber-light)', color: 'var(--amber)', border: 'none' }}>En attente</Badge>
    if (status === 'APPROVED') return <Badge style={{ background: 'var(--green-light)', color: 'var(--green)', border: 'none' }}>Approuvé</Badge>
    return <Badge style={{ background: 'var(--red-light)', color: ADMIN_RED, border: 'none' }}>Refusé</Badge>
  }

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Liste d&apos;attente</h1>
          <p className="text-sm" style={{ color: 'var(--text3)' }}>Gérez les demandes d&apos;accès à ArchFlow</p>
        </div>
        <Button
          onClick={() => { setShowDirectCreate(true); setDirectResult(null) }}
          style={{ background: ADMIN_RED, color: '#fff', border: 'none' }}
        >
          + Créer compte directement
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex gap-2">
        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-[var(--radius)] text-sm font-medium transition-colors"
            style={{
              background: filter === f ? ADMIN_RED : 'var(--surface)',
              color: filter === f ? '#fff' : 'var(--text2)',
              border: `1px solid ${filter === f ? ADMIN_RED : 'var(--border)'}`,
            }}
          >
            {f === 'ALL' ? 'Toutes' : f === 'PENDING' ? 'En attente' : f === 'APPROVED' ? 'Approuvées' : 'Refusées'}
            {' '}
            <span
              className="ml-1 text-xs px-1.5 py-0.5 rounded-full"
              style={{
                background: filter === f ? 'rgba(255,255,255,0.2)' : 'var(--surface2)',
                color: filter === f ? '#fff' : 'var(--text3)',
              }}
            >
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div
        className="rounded-[var(--radius-lg)] overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        {loading ? (
          <div className="py-16 text-center" style={{ color: 'var(--text3)' }}>Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center" style={{ color: 'var(--text3)' }}>Aucune demande</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text2)' }}>Nom</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text2)' }}>Cabinet</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text2)' }}>Ville</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text2)' }}>Email</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text2)' }}>Date</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text2)' }}>Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => (
                <tr key={entry.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text)' }}>
                    {entry.firstName} {entry.lastName}
                    {entry.message && (
                      <p className="text-xs font-normal mt-0.5 max-w-xs truncate" style={{ color: 'var(--text3)' }} title={entry.message}>
                        {entry.message}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text2)' }}>{entry.cabinetName}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text2)' }}>{entry.city}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text2)' }}>{entry.email}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text3)' }}>
                    {new Date(entry.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">{statusBadge(entry.status)}</td>
                  <td className="px-4 py-3">
                    {entry.status === 'PENDING' && (
                      <div className="flex gap-1.5 justify-end">
                        <Button
                          size="sm"
                          disabled={loadingId === entry.id}
                          onClick={() => { void handleApprove(entry.id) }}
                          style={{ background: 'var(--green-btn)', color: '#fff', border: 'none', fontSize: '11px', height: '26px', padding: '0 8px' }}
                        >
                          Approuver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loadingId === entry.id}
                          onClick={() => { void handleReject(entry.id) }}
                          style={{ borderColor: 'var(--border2)', color: 'var(--text2)', fontSize: '11px', height: '26px', padding: '0 8px' }}
                        >
                          Rejeter
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Dialog création directe */}
      <Dialog open={showDirectCreate} onOpenChange={setShowDirectCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un compte directement</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { void handleDirectCreate(e) }} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label style={{ color: 'var(--text)' }}>Prénom</Label>
                <Input
                  value={directForm.firstName}
                  onChange={e => setDirectForm(p => ({ ...p, firstName: e.target.value }))}
                  required
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>
              <div className="space-y-1.5">
                <Label style={{ color: 'var(--text)' }}>Nom</Label>
                <Input
                  value={directForm.lastName}
                  onChange={e => setDirectForm(p => ({ ...p, lastName: e.target.value }))}
                  required
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: 'var(--text)' }}>Email professionnel</Label>
              <Input
                type="email"
                value={directForm.email}
                onChange={e => setDirectForm(p => ({ ...p, email: e.target.value }))}
                required
                style={{ borderColor: 'var(--border)' }}
              />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: 'var(--text)' }}>Nom du cabinet</Label>
              <Input
                value={directForm.agencyName}
                onChange={e => setDirectForm(p => ({ ...p, agencyName: e.target.value }))}
                required
                style={{ borderColor: 'var(--border)' }}
              />
            </div>

            {directResult && (
              directResult.error ? (
                <p className="text-sm px-3 py-2 rounded" style={{ background: 'var(--red-light)', color: 'var(--red)' }}>
                  {directResult.error}
                </p>
              ) : (
                <div className="text-sm px-3 py-2 rounded" style={{ background: 'var(--green-light)', color: 'var(--green)' }}>
                  <p className="font-medium">Compte créé ✓</p>
                  <p>Mot de passe temporaire : <code className="bg-white/60 px-1 rounded">{directResult.password}</code></p>
                  <p className="text-xs mt-1 opacity-80">Un email a été envoyé avec les identifiants.</p>
                </div>
              )
            )}

            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setShowDirectCreate(false)} style={{ borderColor: 'var(--border2)' }}>
                Annuler
              </Button>
              <Button type="submit" disabled={directSaving} style={{ background: ADMIN_RED, color: '#fff', border: 'none' }}>
                {directSaving ? 'Création...' : 'Créer le compte'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
