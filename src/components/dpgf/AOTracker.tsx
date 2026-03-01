'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  FileText,
  Plus,
  RefreshCw,
  XCircle,
  ArrowLeft,
} from 'lucide-react'

interface Company {
  id: string
  status: string
  paymentStatus: string | null
  tokenUsedAt: Date | null
  offer: { id: string; submittedAt: Date | null; isComplete: boolean } | null
  companyUser: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    agency: { name: string } | null
  } | null
}

interface AOData {
  id: string
  name: string
  status: string
  deadline: string
  instructions: string | null
  allowCustomQty: boolean
  isPaid: boolean
  paymentAmount: number | null
  lotIds: string[]
}

interface Lot {
  id: string
  number: number
  name: string
}

interface Props {
  ao: AOData
  projectId: string
  projectName: string
  selectedLots: Lot[]
  companies: Company[]
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
    INVITED: { label: 'Invité', bg: 'var(--surface2)', color: 'var(--text2)', icon: <Circle size={14} /> },
    OPENED: { label: 'Vu', bg: 'var(--amber-light)', color: 'var(--amber)', icon: <AlertCircle size={14} /> },
    IN_PROGRESS: { label: 'En cours', bg: 'var(--amber-light)', color: 'var(--amber)', icon: <Clock size={14} /> },
    SUBMITTED: { label: 'Soumis', bg: 'var(--green-light)', color: 'var(--green)', icon: <CheckCircle2 size={14} /> },
    INCOMPLETE: { label: 'Incomplet', bg: 'var(--red-light)', color: 'var(--red)', icon: <XCircle size={14} /> },
  }
  const s = map[status] ?? map['INVITED']
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {s.icon}
      {s.label}
    </span>
  )
}

function aoStatusBadge(status: string) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    DRAFT: { label: 'Brouillon', bg: 'var(--surface2)', color: 'var(--text2)' },
    SENT: { label: 'Envoyé', bg: 'var(--amber-light)', color: 'var(--amber)' },
    IN_PROGRESS: { label: 'En cours', bg: 'var(--amber-light)', color: 'var(--amber)' },
    CLOSED: { label: 'Clôturé', bg: 'var(--red-light)', color: 'var(--red)' },
    ARCHIVED: { label: 'Archivé', bg: 'var(--surface2)', color: 'var(--text3)' },
  }
  const s = map[status] ?? map['DRAFT']
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}

function Countdown({ deadline }: { deadline: string }) {
  const now = new Date()
  const end = new Date(deadline)
  const diff = end.getTime() - now.getTime()

  if (diff <= 0) {
    return <span style={{ color: 'var(--red)' }}>Délai dépassé</span>
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  return (
    <span style={{ color: days <= 3 ? 'var(--amber)' : 'var(--green)' }}>
      {days > 0 ? `${days}j ${hours}h` : `${hours}h`}
    </span>
  )
}

export function AOTracker({ ao, projectId, projectName, selectedLots, companies: initialCompanies }: Props) {
  const router = useRouter()

  const [companies, setCompanies] = useState<Company[]>(initialCompanies)
  const [emailInput, setEmailInput] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aoStatus, setAoStatus] = useState(ao.status)

  const deadline = new Date(ao.deadline)
  const isClosed = aoStatus === 'CLOSED' || aoStatus === 'ARCHIVED'

  async function handleInvite() {
    if (!emailInput.trim()) return
    setInviteError(null)
    setInviting(true)

    try {
      const res = await fetch(`/api/ao/${ao.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim() }),
      })

      const data = await res.json() as { error?: string; aoCompanyId?: string }
      if (!res.ok) {
        setInviteError(data.error ?? 'Erreur')
        return
      }

      // Ajouter une entreprise placeholder dans la liste
      setCompanies((prev) => [
        ...prev,
        {
          id: data.aoCompanyId!,
          status: 'INVITED',
          paymentStatus: null,
          tokenUsedAt: null,
          offer: null,
          companyUser: { id: '', email: emailInput.trim(), firstName: null, lastName: null, agency: null },
        },
      ])
      setEmailInput('')
    } catch {
      setInviteError('Erreur réseau')
    } finally {
      setInviting(false)
    }
  }

  async function handleClose() {
    setClosing(true)
    setError(null)

    try {
      const res = await fetch(`/api/ao/${ao.id}/close`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Erreur')
        return
      }
      setAoStatus('CLOSED')
    } catch {
      setError('Erreur réseau')
    } finally {
      setClosing(false)
    }
  }

  const submittedCount = companies.filter((c) => c.status === 'SUBMITTED').length

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      {/* En-tête */}
      <div>
        <button
          onClick={() => router.push(`/dpgf/${projectId}`)}
          className="flex items-center gap-1 text-sm mb-3 hover:underline"
          style={{ color: 'var(--text2)' }}
        >
          <ArrowLeft size={14} /> {projectName}
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-2xl"
              style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--text)' }}
            >
              {ao.name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              {aoStatusBadge(aoStatus)}
              <span className="text-sm" style={{ color: 'var(--text2)' }}>
                Deadline :{' '}
                <strong>
                  {deadline.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </strong>
              </span>
              {!isClosed && (
                <span className="text-sm" style={{ color: 'var(--text2)' }}>
                  Temps restant : <Countdown deadline={ao.deadline} />
                </span>
              )}
            </div>
          </div>
          {!isClosed && (
            <Button
              onClick={handleClose}
              disabled={closing}
              variant="outline"
              className="text-sm"
              style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
            >
              <XCircle size={15} className="mr-1.5" />
              {closing ? 'Clôture...' : 'Clôturer l\'AO'}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Entreprises invitées', value: companies.length, icon: <FileText size={18} /> },
          { label: 'Offres soumises', value: submittedCount, icon: <CheckCircle2 size={18} /> },
          {
            label: 'Taux de réponse',
            value: companies.length ? `${Math.round((submittedCount / companies.length) * 100)}%` : '—',
            icon: <RefreshCw size={18} />,
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="p-4 rounded-[var(--radius-lg)]"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--text3)' }}>
              {stat.icon}
              <span className="text-xs">{stat.label}</span>
            </div>
            <p className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Lots inclus */}
      <div
        className="p-4 rounded-[var(--radius-lg)]"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <p className="text-xs font-medium mb-3 uppercase tracking-wider" style={{ color: 'var(--text3)' }}>
          Lots inclus
        </p>
        <div className="flex flex-wrap gap-2">
          {selectedLots.map((l) => (
            <span
              key={l.id}
              className="text-sm px-2.5 py-1 rounded-full"
              style={{ background: 'var(--green-light)', color: 'var(--green)' }}
            >
              Lot {l.number} — {l.name}
            </span>
          ))}
        </div>
      </div>

      {/* Tableau des entreprises */}
      <div
        className="rounded-[var(--radius-lg)] overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
            Entreprises consultées
          </h2>

          {/* Inviter une nouvelle entreprise */}
          {!isClosed && (
            <div className="flex items-center gap-2">
              <Input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleInvite())}
                placeholder="email@entreprise.fr"
                className="h-8 text-sm"
                style={{ borderColor: 'var(--border)', color: 'var(--text)', width: '220px' }}
              />
              <Button
                onClick={handleInvite}
                disabled={inviting || !emailInput.trim()}
                className="h-8 text-sm px-3"
                style={{ background: 'var(--green-btn)', color: '#fff', border: 'none' }}
              >
                <Plus size={14} className="mr-1" />
                {inviting ? '...' : 'Inviter'}
              </Button>
            </div>
          )}
        </div>

        {inviteError && (
          <div className="px-4 py-2 text-sm" style={{ background: 'var(--red-light)', color: 'var(--red)' }}>
            {inviteError}
          </div>
        )}

        {companies.length === 0 ? (
          <div className="p-8 text-center" style={{ color: 'var(--text3)' }}>
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucune entreprise invitée</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--text2)' }}>
                  Entreprise
                </th>
                <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--text2)' }}>
                  Statut
                </th>
                <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--text2)' }}>
                  Offre soumise
                </th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c, i) => (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: i < companies.length - 1 ? '1px solid var(--border)' : undefined,
                  }}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium" style={{ color: 'var(--text)' }}>
                      {c.companyUser?.agency?.name ?? c.companyUser?.email ?? '—'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                      {c.companyUser?.email}
                    </p>
                  </td>
                  <td className="px-4 py-3">{statusBadge(c.status)}</td>
                  <td className="px-4 py-3">
                    {c.offer?.submittedAt ? (
                      <span style={{ color: 'var(--green)' }}>
                        {new Date(c.offer.submittedAt).toLocaleDateString('fr-FR')}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text3)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Instructions */}
      {ao.instructions && (
        <div
          className="p-4 rounded-[var(--radius-lg)]"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <p className="text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: 'var(--text3)' }}>
            Instructions aux entreprises
          </p>
          <p className="text-sm whitespace-pre-line" style={{ color: 'var(--text2)' }}>
            {ao.instructions}
          </p>
        </div>
      )}

      {error && (
        <p
          className="text-sm px-4 py-3 rounded-[var(--radius)]"
          style={{ background: 'var(--red-light)', color: 'var(--red)' }}
        >
          {error}
        </p>
      )}
    </div>
  )
}
