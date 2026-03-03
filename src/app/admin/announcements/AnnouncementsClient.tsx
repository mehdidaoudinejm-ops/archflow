'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import type { Announcement, AnnouncementType } from '@prisma/client'

const TYPE_STYLES: Record<AnnouncementType, { bg: string; color: string; label: string }> = {
  INFO: { bg: '#EFF6FF', color: '#1D4ED8', label: 'Info' },
  SUCCESS: { bg: 'var(--green-light)', color: 'var(--green)', label: 'Succès' },
  WARNING: { bg: 'var(--amber-light)', color: 'var(--amber)', label: 'Warning' },
}

const PREVIEW_STYLES: Record<AnnouncementType, { bg: string; border: string; color: string }> = {
  INFO: { bg: '#EFF6FF', border: '#BFDBFE', color: '#1D4ED8' },
  SUCCESS: { bg: 'var(--green-light)', border: '#A7F3D0', color: 'var(--green)' },
  WARNING: { bg: 'var(--amber-light)', border: '#FDE68A', color: 'var(--amber)' },
}

const empty = {
  message: '',
  type: 'INFO' as AnnouncementType,
  startDate: '',
  endDate: '',
  isActive: true,
  link: '',
}

export function AnnouncementsClient() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/announcements')
      .then(r => r.json())
      .then((d: Announcement[]) => setAnnouncements(d))
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        link: form.link || null,
      }),
    })
    const data = await res.json() as Announcement
    setAnnouncements(prev => [data, ...prev])
    setForm(empty)
    setSaving(false)
  }

  async function toggleActive(id: string, isActive: boolean) {
    setLoadingId(id)
    const res = await fetch(`/api/admin/announcements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    })
    const data = await res.json() as Announcement
    setAnnouncements(prev => prev.map(a => a.id === id ? data : a))
    setLoadingId(null)
  }

  async function handleDelete(id: string) {
    setLoadingId(id)
    await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' })
    setAnnouncements(prev => prev.filter(a => a.id !== id))
    setLoadingId(null)
  }

  const previewStyle = PREVIEW_STYLES[form.type]

  return (
    <div className="p-8 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Bannières d&apos;annonce</h1>
        <p className="text-sm" style={{ color: 'var(--text3)' }}>Créez des messages qui s&apos;affichent pour tous les utilisateurs</p>
      </div>

      {/* Formulaire création */}
      <div
        className="rounded-[var(--radius-lg)] p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Nouvelle bannière</h2>
        <form onSubmit={e => { void handleCreate(e) }} className="space-y-4">
          <div className="space-y-1.5">
            <Label style={{ color: 'var(--text)' }}>Message</Label>
            <Textarea
              value={form.message}
              onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
              placeholder="Maintenance programmée ce soir à 22h..."
              required
              rows={2}
              style={{ borderColor: 'var(--border)', resize: 'none' }}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label style={{ color: 'var(--text)' }}>Type</Label>
              <select
                value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value as AnnouncementType }))}
                className="w-full h-9 rounded-md border px-3 text-sm"
                style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--surface)' }}
              >
                <option value="INFO">Info (bleu)</option>
                <option value="SUCCESS">Succès (vert)</option>
                <option value="WARNING">Warning (orange)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: 'var(--text)' }}>Date début (optionnel)</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                style={{ borderColor: 'var(--border)' }}
              />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: 'var(--text)' }}>Date fin (optionnel)</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                style={{ borderColor: 'var(--border)' }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label style={{ color: 'var(--text)' }}>Lien (optionnel)</Label>
            <Input
              type="url"
              value={form.link}
              onChange={e => setForm(p => ({ ...p, link: e.target.value }))}
              placeholder="https://..."
              style={{ borderColor: 'var(--border)' }}
            />
          </div>

          {/* Prévisualisation */}
          {form.message && (
            <div
              className="px-4 py-3 rounded-[var(--radius)] text-sm flex items-center gap-2"
              style={{ background: previewStyle.bg, border: `1px solid ${previewStyle.border}`, color: previewStyle.color }}
            >
              <span>
                {form.type === 'INFO' ? 'ℹ️' : form.type === 'SUCCESS' ? '✅' : '⚠️'}
              </span>
              <span>{form.message}</span>
              {form.link && <a href={form.link} className="ml-auto underline text-xs">En savoir plus →</a>}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              style={{ background: '#DC2626', color: '#fff', border: 'none' }}
            >
              {saving ? 'Création...' : 'Créer la bannière'}
            </Button>
          </div>
        </form>
      </div>

      {/* Liste bannières */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Bannières existantes ({announcements.length})
        </h2>
        {announcements.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text3)' }}>Aucune bannière créée</p>
        ) : (
          announcements.map(a => (
            <div
              key={a.id}
              className="rounded-[var(--radius)] p-4 flex items-start gap-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge style={{ background: TYPE_STYLES[a.type].bg, color: TYPE_STYLES[a.type].color, border: 'none', fontSize: '10px' }}>
                    {TYPE_STYLES[a.type].label}
                  </Badge>
                  {a.isActive ? (
                    <Badge style={{ background: 'var(--green-light)', color: 'var(--green)', border: 'none', fontSize: '10px' }}>Actif</Badge>
                  ) : (
                    <Badge style={{ background: 'var(--surface2)', color: 'var(--text3)', border: 'none', fontSize: '10px' }}>Inactif</Badge>
                  )}
                </div>
                <p className="text-sm" style={{ color: 'var(--text)' }}>{a.message}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text3)' }}>
                  Créée le {new Date(a.createdAt).toLocaleDateString('fr-FR')}
                  {a.endDate && ` · Expire le ${new Date(a.endDate).toLocaleDateString('fr-FR')}`}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loadingId === a.id}
                  onClick={() => { void toggleActive(a.id, a.isActive) }}
                  style={{ fontSize: '11px', height: '26px', padding: '0 8px', borderColor: 'var(--border2)' }}
                >
                  {a.isActive ? 'Désactiver' : 'Activer'}
                </Button>
                <Button
                  size="sm"
                  disabled={loadingId === a.id}
                  onClick={() => { void handleDelete(a.id) }}
                  style={{ fontSize: '11px', height: '26px', padding: '0 8px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
                >
                  Supprimer
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
