'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

interface AdminEmailRecord {
  id: string
  subject: string
  body: string
  segment: string
  sentAt: string
  recipientCount: number
}

const SEGMENTS = [
  { value: 'ALL_ARCHITECTS', label: 'Tous les architectes' },
  { value: 'WAITLIST', label: 'Liste d\'attente (PENDING)' },
  { value: 'NO_PROJECT', label: 'Sans projet créé' },
]

function segmentLabel(value: string) {
  return SEGMENTS.find(s => s.value === value)?.label ?? value
}

export function AdminEmailsClient() {
  const [history, setHistory] = useState<AdminEmailRecord[]>([])
  const [form, setForm] = useState({ subject: '', body: '', segment: 'ALL_ARCHITECTS' })
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ count?: number; error?: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/emails')
      .then(r => r.json())
      .then((d: AdminEmailRecord[]) => setHistory(d))
  }, [])

  async function sendEmail(testOnly: boolean) {
    setSending(true)
    setResult(null)
    const res = await fetch('/api/admin/emails/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, testOnly }),
    })
    const data = await res.json() as { recipientCount?: number; error?: string }
    if (res.ok && !testOnly) {
      const record: AdminEmailRecord = {
        id: Date.now().toString(),
        ...form,
        sentAt: new Date().toISOString(),
        recipientCount: data.recipientCount ?? 0,
      }
      setHistory(prev => [record, ...prev])
      setForm({ subject: '', body: '', segment: 'ALL_ARCHITECTS' })
    }
    setResult({ count: data.recipientCount, error: data.error })
    setSending(false)
  }

  return (
    <div className="p-8 space-y-8 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Communication email</h1>
        <p className="text-sm" style={{ color: 'var(--text3)' }}>Envoyez des emails à un segment d&apos;utilisateurs</p>
      </div>

      {/* Formulaire envoi */}
      <div
        className="rounded-[var(--radius-lg)] p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Nouvel email</h2>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label style={{ color: 'var(--text)' }}>Segment cible</Label>
            <select
              value={form.segment}
              onChange={e => setForm(p => ({ ...p, segment: e.target.value }))}
              className="w-full h-9 rounded-md border px-3 text-sm"
              style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--surface)' }}
            >
              {SEGMENTS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label style={{ color: 'var(--text)' }}>Sujet</Label>
            <Input
              value={form.subject}
              onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
              placeholder="Nouveautés ArchFlow — Mars 2026"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>

          <div className="space-y-1.5">
            <Label style={{ color: 'var(--text)' }}>Corps du message</Label>
            <Textarea
              value={form.body}
              onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
              placeholder="Bonjour,&#10;&#10;Nous sommes ravis de vous annoncer..."
              rows={8}
              style={{ borderColor: 'var(--border)', resize: 'vertical' }}
            />
          </div>

          {result && (
            <div
              className="px-4 py-3 rounded-[var(--radius)] text-sm"
              style={{
                background: result.error ? 'var(--red-light)' : 'var(--green-light)',
                color: result.error ? 'var(--red)' : 'var(--green)',
              }}
            >
              {result.error
                ? `Erreur : ${result.error}`
                : `Email envoyé à ${result.count} destinataire${result.count !== 1 ? 's' : ''}`}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={sending || !form.subject || !form.body}
              onClick={() => { void sendEmail(true) }}
              style={{ borderColor: 'var(--border2)', color: 'var(--text2)', fontSize: '13px' }}
            >
              Envoyer un test à moi-même
            </Button>
            <Button
              type="button"
              disabled={sending || !form.subject || !form.body}
              onClick={() => { void sendEmail(false) }}
              style={{ background: '#DC2626', color: '#fff', border: 'none', fontSize: '13px' }}
            >
              {sending ? 'Envoi...' : 'Envoyer à tous'}
            </Button>
          </div>
        </div>
      </div>

      {/* Historique */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Historique</h2>
        {history.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text3)' }}>Aucun email envoyé</p>
        ) : (
          <div className="space-y-2">
            {history.map(email => (
              <div
                key={email.id}
                className="rounded-[var(--radius)] px-4 py-3 flex items-start gap-4"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{email.subject}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                    {new Date(email.sentAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {' · '}
                    <Badge style={{ background: 'var(--surface2)', color: 'var(--text3)', border: 'none', fontSize: '10px' }}>
                      {segmentLabel(email.segment)}
                    </Badge>
                  </p>
                </div>
                <span className="text-sm font-semibold flex-shrink-0" style={{ color: 'var(--text2)' }}>
                  {email.recipientCount} destinataires
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
