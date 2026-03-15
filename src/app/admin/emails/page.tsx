'use client'

import { useCallback, useEffect, useState } from 'react'

type Segment = 'TOUS' | 'SANS_PROJET' | 'SANS_AO' | 'INACTIFS_30J'

interface EmailLog {
  id: string
  subject: string
  segment: string
  sentAt: string
  recipientCount: number
  sentBy: string | null
}

const segmentLabels: Record<Segment, string> = {
  TOUS: 'Tous les utilisateurs actifs',
  SANS_PROJET: 'Sans projet créé',
  SANS_AO: "Sans appel d'offre lancé",
  INACTIFS_30J: 'Inactifs depuis 30 jours',
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

export default function AdminEmailsPage() {
  const [form, setForm] = useState({
    subject: '',
    body: '',
    segment: 'TOUS' as Segment,
  })
  const [sending, setSending] = useState(false)
  const [testSending, setTestSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; recipientCount: number; test?: boolean } | null>(null)
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)

  const loadLogs = useCallback(async () => {
    setLogsLoading(true)
    const data = await fetch('/api/admin/emails/history').then((r) => r.json())
    setLogs(Array.isArray(data) ? data : [])
    setLogsLoading(false)
  }, [])

  useEffect(() => { loadLogs() }, [loadLogs])

  async function send(test = false) {
    if (!form.subject.trim() || !form.body.trim()) return
    if (test) setTestSending(true)
    else setSending(true)
    setResult(null)
    const res = await fetch('/api/admin/emails/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, test }),
    })
    const data = await res.json()
    setResult(data)
    if (!test && res.ok) loadLogs()
    if (test) setTestSending(false)
    else setSending(false)
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#1A1A18' }}>Emails</h1>
        <p className="text-sm" style={{ color: '#6B6B65' }}>Envoi de campagnes email aux utilisateurs</p>
      </div>

      {/* Formulaire */}
      <div
        className="rounded-[14px] p-6 space-y-4"
        style={{ background: '#fff', border: '1px solid #E8E8E3', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: '#1A1A18' }}>Nouvelle campagne</h2>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#6B6B65' }}>Segment destinataires</label>
          <select
            value={form.segment}
            onChange={(e) => setForm((f) => ({ ...f, segment: e.target.value as Segment }))}
            style={inputStyle}
          >
            {(Object.entries(segmentLabels) as [Segment, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#6B6B65' }}>Sujet</label>
          <input
            type="text"
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            placeholder="Objet de l'email..."
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#6B6B65' }}>Corps du message</label>
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            placeholder="Contenu de l'email..."
            rows={6}
            style={{ ...inputStyle, resize: 'none' }}
          />
        </div>

        {result && (
          <div
            className="px-4 py-3 rounded-lg text-sm"
            style={{
              background: result.ok ? '#EAF3ED' : '#FEE8E8',
              color: result.ok ? '#1A5C3A' : '#9B1C1C',
            }}
          >
            {result.ok
              ? result.test
                ? 'Email de test envoyé avec succès.'
                : `Envoyé à ${result.recipientCount} destinataire${result.recipientCount > 1 ? 's' : ''}.`
              : "Erreur lors de l'envoi."}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={() => send(true)}
            disabled={testSending || sending || !form.subject.trim() || !form.body.trim()}
            className="px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
            style={{ background: '#F3F4F6', color: '#6B6B65', border: '1px solid #E8E8E3' }}
          >
            {testSending ? 'Envoi...' : 'Envoyer test à moi-même'}
          </button>
          <button
            onClick={() => send(false)}
            disabled={sending || testSending || !form.subject.trim() || !form.body.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{ background: 'var(--green)', color: '#fff' }}
          >
            {sending ? 'Envoi en cours...' : `Envoyer à ${segmentLabels[form.segment]}`}
          </button>
        </div>
      </div>

      {/* Historique */}
      <div>
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#1A1A18' }}>Historique des envois</h2>
        {logsLoading ? (
          <p className="text-sm" style={{ color: '#9B9B94' }}>Chargement...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm" style={{ color: '#9B9B94' }}>Aucun envoi pour le moment.</p>
        ) : (
          <div
            className="rounded-[14px] overflow-hidden"
            style={{ background: '#fff', border: '1px solid #E8E8E3', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #E8E8E3' }}>
                  {['Sujet', 'Segment', 'Envoyé par', 'Date', 'Destinataires'].map((h, i) => (
                    <th
                      key={h}
                      className="px-5 py-3 font-medium"
                      style={{ color: '#6B6B65', fontSize: 12, textAlign: i === 4 ? 'right' : 'left' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.id} style={{ borderBottom: i < logs.length - 1 ? '1px solid #E8E8E3' : undefined }}>
                    <td className="px-5 py-3 font-medium" style={{ color: '#1A1A18' }}>{log.subject}</td>
                    <td className="px-5 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ background: '#F3F4F6', color: '#6B6B65' }}
                      >
                        {log.segment}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: '#9B9B94' }}>{log.sentBy ?? '—'}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: '#9B9B94' }}>
                      {new Date(log.sentAt).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-medium" style={{ color: '#1A1A18' }}>
                      {log.recipientCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
