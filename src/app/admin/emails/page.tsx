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
  SANS_AO: 'Sans appel d\'offre lancé',
  INACTIFS_30J: 'Inactifs depuis 30 jours',
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

  const inputClass = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500'

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-semibold text-zinc-100">Emails</h1>

      {/* Formulaire */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-zinc-200">Nouvelle campagne</h2>

        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Segment destinataires</label>
          <select
            value={form.segment}
            onChange={(e) => setForm((f) => ({ ...f, segment: e.target.value as Segment }))}
            className={inputClass}
          >
            {(Object.entries(segmentLabels) as [Segment, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Sujet</label>
          <input
            type="text"
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            placeholder="Objet de l'email..."
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Corps du message</label>
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            placeholder="Contenu de l'email..."
            rows={6}
            className={`${inputClass} resize-none`}
          />
        </div>

        {result && (
          <div className={`px-4 py-3 rounded-lg text-sm ${result.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {result.ok
              ? result.test
                ? 'Email de test envoyé avec succès.'
                : `Envoyé à ${result.recipientCount} destinataire${result.recipientCount > 1 ? 's' : ''}.`
              : 'Erreur lors de l\'envoi.'}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={() => send(true)}
            disabled={testSending || sending || !form.subject.trim() || !form.body.trim()}
            className="px-4 py-2 rounded-lg bg-zinc-700 text-zinc-200 text-sm hover:bg-zinc-600 transition-colors disabled:opacity-50"
          >
            {testSending ? 'Envoi...' : 'Envoyer test à moi-même'}
          </button>
          <button
            onClick={() => send(false)}
            disabled={sending || testSending || !form.subject.trim() || !form.body.trim()}
            className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {sending ? 'Envoi en cours...' : `Envoyer à ${segmentLabels[form.segment]}`}
          </button>
        </div>
      </div>

      {/* Historique */}
      <div>
        <h2 className="text-base font-semibold text-zinc-200 mb-4">Historique des envois</h2>
        {logsLoading ? (
          <p className="text-zinc-500 text-sm">Chargement...</p>
        ) : logs.length === 0 ? (
          <p className="text-zinc-600 text-sm">Aucun envoi pour le moment.</p>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-5 py-3 text-zinc-500 font-medium">Sujet</th>
                  <th className="text-left px-5 py-3 text-zinc-500 font-medium">Segment</th>
                  <th className="text-left px-5 py-3 text-zinc-500 font-medium">Envoyé par</th>
                  <th className="text-left px-5 py-3 text-zinc-500 font-medium">Date</th>
                  <th className="text-right px-5 py-3 text-zinc-500 font-medium">Destinataires</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-zinc-800/50">
                    <td className="px-5 py-3 text-zinc-200">{log.subject}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {log.segment}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-zinc-500 text-xs">{log.sentBy ?? '—'}</td>
                    <td className="px-5 py-3 text-zinc-500">
                      {new Date(log.sentAt).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-300 font-mono">{log.recipientCount}</td>
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
