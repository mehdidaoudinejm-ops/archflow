'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
  FolderOpen,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Settings,
  Bell,
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

interface RequiredDoc {
  type: string
  label: string
  required: boolean
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
  requiredDocs: RequiredDoc[] | null
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

// ── Types fiche entreprise ───────────────────────────────

interface AdminDoc {
  id: string
  type: string
  status: string
  rejectionReason: string | null
  expiresAt: string | null
  fileUrl: string
}

interface CompanyDetail {
  id: string
  status: string
  tokenUsedAt: string | null
  offer: { submittedAt: string | null; isComplete: boolean } | null
  adminDocs: AdminDoc[]
  companyUser: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    agency: {
      id: string
      name: string
      siret: string | null
      siretVerified: boolean
      legalForm: string | null
      companyAddress: string | null
      postalCode: string | null
      city: string | null
      phone: string | null
      trade: string | null
      signatoryQuality: string | null
    } | null
  }
  activityLogs: Array<{ id: string; action: string; module: string; createdAt: string }>
}

// ── Helpers ──────────────────────────────────────────────

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

function docStatusBadge(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'En attente', color: 'var(--amber)' },
    VALID: { label: 'Validé', color: 'var(--green)' },
    REJECTED: { label: 'Refusé', color: 'var(--red)' },
    EXPIRED: { label: 'Expiré', color: 'var(--red)' },
  }
  const s = map[status] ?? { label: status, color: 'var(--text3)' }
  return <span className="text-xs font-medium" style={{ color: s.color }}>{s.label}</span>
}

const DOC_LABELS: Record<string, string> = {
  kbis: 'Kbis',
  decennale: 'Assurance décennale',
  rcpro: 'RC Pro',
  rib: 'RIB',
  urssaf: 'Attestation URSSAF',
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

// ── Fiche entreprise (Sheet) ─────────────────────────────

function CompanySheet({
  aoId,
  companyId,
  open,
  onClose,
}: {
  aoId: string
  companyId: string
  open: boolean
  onClose: () => void
}) {
  const [detail, setDetail] = useState<CompanyDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  async function loadDetail() {
    if (loaded) return
    setLoading(true)
    try {
      const res = await fetch(`/api/ao/${aoId}/companies/${companyId}`)
      if (res.ok) {
        const data = await res.json() as CompanyDetail
        setDetail(data)
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
      setLoaded(true)
    }
  }

  function handleOpenChange(v: boolean) {
    if (v) loadDetail()
    else onClose()
  }

  const agency = detail?.companyUser?.agency

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto"
        style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}
      >
        <SheetHeader className="mb-6">
          <SheetTitle style={{ color: 'var(--text)', fontFamily: '"DM Serif Display", serif' }}>
            Fiche entreprise
          </SheetTitle>
        </SheetHeader>

        {loading && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text3)' }}>Chargement...</p>
        )}

        {!loading && detail && (
          <div className="space-y-6">
            {/* Identité */}
            <section>
              <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>
                Identité
              </h3>
              <div className="space-y-2">
                <Row label="Raison sociale" value={agency?.name ?? '—'} />
                <Row label="Forme juridique" value={agency?.legalForm ?? '—'} />
                <Row label="Corps de métier" value={agency?.trade ?? '—'} />
                <Row label="Email" value={detail.companyUser.email} />
                <Row
                  label="Signataire"
                  value={[detail.companyUser.firstName, detail.companyUser.lastName].filter(Boolean).join(' ') || '—'}
                />
                <Row label="Qualité" value={agency?.signatoryQuality ?? '—'} />
                <Row label="Téléphone" value={agency?.phone ?? '—'} />
              </div>
            </section>

            {/* Adresse */}
            {(agency?.companyAddress || agency?.city) && (
              <section>
                <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>
                  Adresse
                </h3>
                <div className="space-y-2">
                  {agency?.companyAddress && <Row label="Adresse" value={agency.companyAddress} />}
                  {(agency?.postalCode || agency?.city) && (
                    <Row
                      label="Ville"
                      value={[agency?.postalCode, agency?.city].filter(Boolean).join(' ')}
                    />
                  )}
                </div>
              </section>
            )}

            {/* SIRET */}
            <section>
              <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>
                SIRET
              </h3>
              {agency?.siret ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono" style={{ color: 'var(--text)' }}>
                    {agency.siret}
                  </span>
                  {agency.siretVerified ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: 'var(--green-light)', color: 'var(--green)' }}
                    >
                      <ShieldCheck size={13} /> Vérifié
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: 'var(--amber-light)', color: 'var(--amber)' }}
                    >
                      <ShieldAlert size={13} /> À vérifier
                    </span>
                  )}
                </div>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: 'var(--surface2)', color: 'var(--text3)' }}
                >
                  <ShieldOff size={13} /> Non renseigné
                </span>
              )}
            </section>

            {/* Statut AO */}
            <section>
              <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>
                Statut sur cet AO
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--text2)' }}>Participation</span>
                  {statusBadge(detail.status)}
                </div>
                {detail.offer?.submittedAt && (
                  <Row
                    label="Offre soumise le"
                    value={new Date(detail.offer.submittedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  />
                )}
                {detail.tokenUsedAt && (
                  <Row
                    label="Lien ouvert le"
                    value={new Date(detail.tokenUsedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  />
                )}
              </div>
            </section>

            {/* Documents admin */}
            <section>
              <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>
                Documents administratifs
              </h3>
              {detail.adminDocs.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text3)' }}>Aucun document déposé</p>
              ) : (
                <div className="space-y-2">
                  {detail.adminDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between px-3 py-2 rounded-[var(--radius)]"
                      style={{ background: 'var(--surface2)' }}
                    >
                      <span className="text-sm" style={{ color: 'var(--text)' }}>
                        {DOC_LABELS[doc.type] ?? doc.type}
                      </span>
                      {docStatusBadge(doc.status)}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Historique */}
            {detail.activityLogs.length > 0 && (
              <section>
                <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>
                  Historique
                </h3>
                <div className="space-y-1.5">
                  {detail.activityLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2">
                      <span className="text-xs mt-0.5 flex-shrink-0" style={{ color: 'var(--text3)' }}>
                        {new Date(log.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text2)' }}>
                        {log.action}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm flex-shrink-0" style={{ color: 'var(--text2)' }}>{label}</span>
      <span className="text-sm text-right" style={{ color: 'var(--text)' }}>{value}</span>
    </div>
  )
}

// ── Sheet Modifier AO ─────────────────────────────────────

function EditAOSheet({
  ao,
  open,
  onClose,
  onSaved,
}: {
  ao: AOData
  open: boolean
  onClose: () => void
  onSaved: (updates: Partial<AOData>) => void
}) {
  const DEFAULT_DOCS: RequiredDoc[] = [
    { type: 'kbis', label: 'Kbis', required: true },
    { type: 'decennale', label: 'Décennale', required: true },
    { type: 'rcpro', label: 'RC Pro', required: true },
    { type: 'rib', label: 'RIB', required: true },
    { type: 'urssaf', label: 'Attestation URSSAF', required: true },
  ]

  const [name, setName] = useState(ao.name)
  const [deadline, setDeadline] = useState(ao.deadline.split('T')[0])
  const [instructions, setInstructions] = useState(ao.instructions ?? '')
  const [allowCustomQty, setAllowCustomQty] = useState(ao.allowCustomQty)
  const [requiredDocs, setRequiredDocs] = useState<RequiredDoc[]>(ao.requiredDocs ?? DEFAULT_DOCS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim() || !deadline) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/ao/${ao.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          deadline,
          instructions: instructions.trim() || null,
          allowCustomQty,
          requiredDocs,
        }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        setError(d.error ?? 'Erreur')
        return
      }
      onSaved({ name: name.trim(), deadline, instructions: instructions.trim() || null, allowCustomQty, requiredDocs })
      onClose()
    } catch {
      setError('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto"
        style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}
      >
        <SheetHeader className="mb-6">
          <SheetTitle style={{ color: 'var(--text)', fontFamily: '"DM Serif Display", serif' }}>
            Modifier les paramètres
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Nom</label>
            <Input value={name} onChange={(e) => setName(e.target.value)}
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Date limite</label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Instructions <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optionnel)</span>
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              className="w-full rounded-[var(--radius)] px-3 py-2 text-sm resize-none focus:outline-none"
              style={{ border: '1px solid var(--border)', color: 'var(--text)', background: 'var(--surface)' }}
            />
          </div>

          <div className="flex items-center gap-3 py-3 px-4 rounded-[var(--radius)]"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            <input type="checkbox" id="acq-edit" checked={allowCustomQty}
              onChange={(e) => setAllowCustomQty(e.target.checked)} className="w-4 h-4" />
            <label htmlFor="acq-edit" className="text-sm" style={{ color: 'var(--text)' }}>
              Autoriser les entreprises à modifier les quantités
            </label>
          </div>

          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Documents administratifs</p>
            <div className="space-y-2">
              {requiredDocs.map((doc, i) => (
                <div key={doc.type}
                  className="flex items-center justify-between px-3 py-2 rounded-[var(--radius)]"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <span className="text-sm" style={{ color: 'var(--text)' }}>{doc.label}</span>
                  <button
                    type="button"
                    onClick={() => setRequiredDocs((prev) => prev.map((d, j) => j === i ? { ...d, required: !d.required } : d))}
                    className="text-xs px-2.5 py-1 rounded font-medium"
                    style={{
                      background: doc.required ? 'var(--green-light)' : 'var(--surface)',
                      color: doc.required ? 'var(--green)' : 'var(--text3)',
                      border: `1px solid ${doc.required ? 'var(--green)' : 'var(--border)'}`,
                    }}
                  >
                    {doc.required ? 'Obligatoire' : 'Facultatif'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm px-3 py-2 rounded-[var(--radius)]"
              style={{ background: 'var(--red-light)', color: 'var(--red)' }}>{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim() || !deadline} className="flex-1"
              style={{ background: 'var(--green-btn)', color: '#fff', border: 'none' }}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Composant principal ───────────────────────────────────

export function AOTracker({ ao, projectId, projectName, selectedLots, companies: initialCompanies }: Props) {
  const router = useRouter()

  const [companies, setCompanies] = useState<Company[]>(initialCompanies)
  const [emailInput, setEmailInput] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [lastDevLink, setLastDevLink] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aoStatus, setAoStatus] = useState(ao.status)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [aoData, setAoData] = useState(ao)
  const [notifying, setNotifying] = useState(false)
  const [notifySuccess, setNotifySuccess] = useState(false)

  const deadline = new Date(aoData.deadline)
  const isClosed = aoStatus === 'CLOSED' || aoStatus === 'ARCHIVED'

  async function handleNotify() {
    setNotifying(true)
    setNotifySuccess(false)
    try {
      await fetch(`/api/ao/${ao.id}/notify-amendment`, { method: 'POST' })
      setNotifySuccess(true)
      setTimeout(() => setNotifySuccess(false), 4000)
    } finally {
      setNotifying(false)
    }
  }

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

      const data = await res.json() as { error?: string; aoCompanyId?: string; devLink?: string }
      if (!res.ok) {
        setInviteError(data.error ?? 'Erreur')
        return
      }

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
      setLastDevLink(data.devLink ?? null)
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
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => router.push(`/dpgf/${projectId}`)}
            className="flex items-center gap-1 text-sm hover:underline"
            style={{ color: 'var(--text2)' }}
          >
            <ArrowLeft size={14} /> {projectName}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/dpgf/${projectId}/dce`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] text-sm"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)' }}
            >
              <FolderOpen size={14} /> DCE
            </button>
            <button
              onClick={() => router.push(`/dpgf/${projectId}/qa`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] text-sm"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)' }}
            >
              <MessageSquare size={14} /> Q&A
            </button>
          </div>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-2xl"
              style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--text)' }}
            >
              {aoData.name}
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
          <div className="flex items-center gap-2">
            {!isClosed && (
              <Button
                onClick={() => setEditOpen(true)}
                variant="outline"
                className="text-sm"
                style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}
              >
                <Settings size={14} className="mr-1.5" />
                Modifier
              </Button>
            )}
            {aoStatus !== 'DRAFT' && (
              <Button
                onClick={handleNotify}
                disabled={notifying}
                variant="outline"
                className="text-sm"
                style={{ borderColor: notifySuccess ? 'var(--green)' : 'var(--border)', color: notifySuccess ? 'var(--green)' : 'var(--text2)' }}
              >
                <Bell size={14} className="mr-1.5" />
                {notifySuccess ? 'Envoyé !' : notifying ? 'Envoi...' : 'Notifier'}
              </Button>
            )}
            {!isClosed && (
              <Button
                onClick={handleClose}
                disabled={closing}
                variant="outline"
                className="text-sm"
                style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
              >
                <XCircle size={15} className="mr-1.5" />
                {closing ? 'Clôture...' : "Clôturer l'AO"}
              </Button>
            )}
          </div>
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

        {lastDevLink && (
          <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'var(--amber-light)', borderBottom: '1px solid var(--border)' }}>
            <span className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--amber)' }}>
              [DEV] Lien :
            </span>
            <span className="text-xs font-mono truncate flex-1" style={{ color: 'var(--text2)' }}>
              {lastDevLink}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(lastDevLink)}
              className="text-xs flex-shrink-0 font-medium"
              style={{ color: 'var(--amber)' }}
            >
              Copier
            </button>
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
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {companies.map((c, i) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedCompanyId(c.id)}
                  className="cursor-pointer hover:bg-[var(--surface2)] transition-colors"
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
                  <td className="px-4 py-3 text-right">
                    <ChevronRight size={15} style={{ color: 'var(--text3)' }} />
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

      {/* Fiche entreprise */}
      {selectedCompanyId && (
        <CompanySheet
          aoId={ao.id}
          companyId={selectedCompanyId}
          open={!!selectedCompanyId}
          onClose={() => setSelectedCompanyId(null)}
        />
      )}

      {/* Modifier AO */}
      <EditAOSheet
        ao={aoData}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={(updates) => setAoData((prev) => ({ ...prev, ...updates }))}
      />
    </div>
  )
}
