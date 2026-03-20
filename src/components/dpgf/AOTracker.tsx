'use client'

import { useState, useEffect } from 'react'
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
  ExternalLink,
  Trophy,
  Ban,
  X,
  Copy,
  Send,
} from 'lucide-react'

interface Company {
  id: string
  status: string
  paymentStatus: string | null
  tokenUsedAt: Date | null
  portalUrl: string | null
  dirigeantNameMatch: boolean | null
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
      legalFormDeclared: string | null
      dateCreationInsee: string | null
      companyAddress: string | null
      postalCode: string | null
      city: string | null
      phone: string | null
      trade: string | null
      signatoryQuality: string | null
    } | null
  }
  dirigeant: { nom: string; prenoms: string } | null
  dirigeantNameMatch: boolean | null
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
    ANALYSED: { label: 'En analyse', bg: '#EEF2FF', color: '#4338CA' },
    AWARDED: { label: 'Attribué', bg: 'var(--green-light)', color: 'var(--green)' },
    INFRUCTUEUX: { label: 'Infructueux', bg: 'var(--surface2)', color: 'var(--text2)' },
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

export function CompanySheet({
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

  useEffect(() => {
    if (!open || loaded) return
    setLoading(true)
    fetch(`/api/ao/${aoId}/companies/${companyId}`)
      .then((res) => res.ok ? res.json() as Promise<CompanyDetail> : Promise.reject())
      .then((data) => setDetail(data))
      .catch(() => {})
      .finally(() => { setLoading(false); setLoaded(true) })
  }, [open, aoId, companyId, loaded])

  function handleOpenChange(v: boolean) {
    if (!v) onClose()
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
                {/* Forme juridique : comparaison INSEE vs déclarée */}
                {(() => {
                  // legalForm n'est fiable comme source INSEE que si SIRET vérifié
                  const isVerified = agency?.siretVerified === true
                  const insee = isVerified ? (agency?.legalForm ?? null) : null
                  const declared = agency?.legalFormDeclared ?? (!isVerified ? agency?.legalForm : null) ?? null

                  const display = insee ?? declared
                  if (!display) return <Row label="Forme juridique" value="—" />

                  if (insee && !declared) return (
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-sm flex-shrink-0" style={{ color: 'var(--text2)' }}>Forme juridique</span>
                      <div className="text-right">
                        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{insee}</span>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>Source INSEE</div>
                      </div>
                    </div>
                  )

                  if (!insee && declared) return <Row label="Forme juridique" value={declared} />

                  // Les deux existent (SIRET vérifié + valeur déclarée) — on compare
                  const match = insee!.toLowerCase().trim() === declared!.toLowerCase().trim()
                  return (
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-sm flex-shrink-0" style={{ color: 'var(--text2)' }}>Forme juridique</span>
                      <div className="text-right space-y-0.5">
                        <div className="flex items-center gap-1.5 justify-end">
                          {match
                            ? <ShieldCheck size={12} style={{ color: 'var(--green)' }} />
                            : <ShieldAlert size={12} style={{ color: 'var(--amber)' }} />}
                          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{insee}</span>
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>Source INSEE</div>
                        {!match && (
                          <div className="flex items-center gap-1.5 justify-end mt-0.5">
                            <span className="text-xs" style={{ color: 'var(--amber)' }}>Déclarée : {declared}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
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
                <div className="space-y-2">
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
                        <ShieldAlert size={13} /> Non vérifié
                      </span>
                    )}
                  </div>
                  {/* Date de création INSEE */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm" style={{ color: 'var(--text2)' }}>Date d&apos;immatriculation</span>
                    {agency?.dateCreationInsee ? (
                      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        {new Date(agency.dateCreationInsee).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text3)' }}>
                        {agency?.siretVerified ? '— (re-vérifier le SIRET)' : '—'}
                      </span>
                    )}
                  </div>
                  {/* Dirigeant data.gouv */}
                  {detail.dirigeant && (
                    <div className="flex items-start justify-between pt-1">
                      <span className="text-sm" style={{ color: 'var(--text2)' }}>Dirigeant (data.gouv)</span>
                      <div className="text-right">
                        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                          {detail.dirigeant.prenoms} {detail.dirigeant.nom}
                        </span>
                        {detail.dirigeantNameMatch === false && (
                          <div className="flex items-center gap-1 justify-end mt-0.5">
                            <ShieldAlert size={12} style={{ color: 'var(--amber)' }} />
                            <span className="text-xs" style={{ color: 'var(--amber)' }}>
                              Différent du signataire enregistré
                            </span>
                          </div>
                        )}
                        {detail.dirigeantNameMatch === true && (
                          <div className="flex items-center gap-1 justify-end mt-0.5">
                            <ShieldCheck size={12} style={{ color: 'var(--green)' }} />
                            <span className="text-xs" style={{ color: 'var(--green)' }}>Correspond au signataire</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <a
                    href={`https://annuaire-entreprises.data.gouv.fr/etablissement/${agency.siret}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs"
                    style={{ color: 'var(--green)', textDecoration: 'none' }}
                  >
                    <ExternalLink size={11} />
                    Voir sur l&apos;annuaire data.gouv.fr
                  </a>
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

            {/* Alerte signataire ≠ dirigeant */}
            {detail.dirigeantNameMatch === false && detail.dirigeant && (
              <div
                className="flex items-start gap-3 px-4 py-3 rounded-[var(--radius)]"
                style={{ background: 'var(--amber-light)', border: '1px solid var(--amber)' }}
              >
                <ShieldAlert size={16} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--amber)' }}>
                    Signataire différent du dirigeant enregistré
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text2)' }}>
                    Personne ayant rempli l&apos;offre :{' '}
                    <strong>{[detail.companyUser.firstName, detail.companyUser.lastName].filter(Boolean).join(' ') || '—'}</strong>
                    {' '}· Dirigeant data.gouv.fr :{' '}
                    <strong>{detail.dirigeant.prenoms} {detail.dirigeant.nom}</strong>
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text2)' }}>
                    Demandez une délégation de pouvoir si ce n&apos;est pas le représentant légal.
                  </p>
                </div>
              </div>
            )}

            {/* Alerte forme juridique ≠ INSEE */}
            {(() => {
              const isVerified = agency?.siretVerified === true
              const insee = isVerified ? (agency?.legalForm ?? null) : null
              const declared = agency?.legalFormDeclared ?? null
              if (!insee || !declared) return null
              const match = insee.toLowerCase().trim() === declared.toLowerCase().trim()
              if (match) return null
              return (
                <div
                  className="flex items-start gap-3 px-4 py-3 rounded-[var(--radius)]"
                  style={{ background: 'var(--amber-light)', border: '1px solid var(--amber)' }}
                >
                  <ShieldAlert size={16} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--amber)' }}>
                      Forme juridique déclarée différente de l&apos;INSEE
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text2)' }}>
                      INSEE : <strong>{insee}</strong> · Déclarée : <strong>{declared}</strong>
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text2)' }}>
                      Vérifiez la cohérence avec le KBIS fourni.
                    </p>
                  </div>
                </div>
              )
            })()}

            {/* Fiabilité */}
            <section>
              <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>
                Fiabilité
              </h3>
              {(() => {
                const checks = [
                  { label: 'Profil renseigné (nom, téléphone, métier)', ok: !!(agency?.trade && agency?.phone && agency?.name) },
                  { label: 'Adresse complète', ok: !!(agency?.companyAddress && agency?.city) },
                  { label: 'SIRET renseigné', ok: !!(agency?.siret) },
                  { label: 'SIRET vérifié', ok: !!(agency?.siretVerified) },
                  { label: 'Dirigeant correspond au signataire', ok: detail.dirigeantNameMatch === true },
                  { label: 'Forme juridique cohérente (INSEE)', ok: (() => { const iv = agency?.siretVerified === true; const i = iv ? (agency?.legalForm ?? null) : null; const d = agency?.legalFormDeclared ?? null; if (!i || !d) return true; return i.toLowerCase().trim() === d.toLowerCase().trim() })() },
                  { label: 'Documents admin déposés', ok: detail.adminDocs.filter((d) => d.status === 'VALID').length >= 2 },
                  { label: 'Offre soumise sur cet AO', ok: !!(detail.offer?.submittedAt) },
                ]
                const done = checks.filter((c) => c.ok).length
                const pct = Math.round((done / checks.length) * 100)
                const color = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)'
                return (
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--surface2)' }}>
                        <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <span className="text-sm font-semibold w-10 text-right" style={{ color }}>{pct}%</span>
                    </div>
                    <div className="space-y-1.5 mt-3">
                      {checks.map((c) => (
                        <div key={c.label} className="flex items-center gap-2">
                          {c.ok
                            ? <ShieldCheck size={13} style={{ color: 'var(--green)', flexShrink: 0 }} />
                            : <ShieldOff size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />}
                          <span className="text-xs" style={{ color: c.ok ? 'var(--text)' : 'var(--text3)' }}>{c.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
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
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aoStatus, setAoStatus] = useState(ao.status)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [closeModalOpen, setCloseModalOpen] = useState(false)
  const [closeOutcome, setCloseOutcome] = useState<'LAUREAT' | 'INFRUCTUEUX' | null>(null)
  const [selectedLaureatId, setSelectedLaureatId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [aoData, setAoData] = useState(ao)
  const [notifying, setNotifying] = useState(false)
  const [notifySuccess, setNotifySuccess] = useState(false)
  const [notifyModalOpen, setNotifyModalOpen] = useState(false)
  const [notifySelectedIds, setNotifySelectedIds] = useState<Set<string>>(new Set())

  const deadline = new Date(aoData.deadline)
  const isClosed = ['CLOSED', 'ANALYSED', 'AWARDED', 'INFRUCTUEUX', 'ARCHIVED'].includes(aoStatus)

  function openNotifyModal() {
    setNotifySelectedIds(new Set(companies.filter((c) => c.status !== 'INCOMPLETE').map((c) => c.id)))
    setNotifyModalOpen(true)
  }

  function toggleNotifyCompany(id: string) {
    setNotifySelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleNotify() {
    if (notifySelectedIds.size === 0) return
    setNotifying(true)
    setNotifySuccess(false)
    try {
      await fetch(`/api/ao/${ao.id}/notify-amendment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyIds: Array.from(notifySelectedIds) }),
      })
      setNotifySuccess(true)
      setNotifyModalOpen(false)
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

      const data = await res.json() as { error?: string; aoCompanyId?: string; portalUrl?: string }
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
          portalUrl: data.portalUrl ?? null,
          offer: null,
          companyUser: { id: '', email: emailInput.trim(), firstName: null, lastName: null, agency: null },
          dirigeantNameMatch: null,
        },
      ])
      setEmailInput('')
    } catch {
      setInviteError('Erreur réseau')
    } finally {
      setInviting(false)
    }
  }

  async function handleCopyLink(companyId: string, portalUrl: string) {
    await navigator.clipboard.writeText(portalUrl)
    setCopiedId(companyId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function handleResend(companyId: string) {
    setResendingId(companyId)
    try {
      await fetch(`/api/ao/${ao.id}/companies/${companyId}/resend`, { method: 'POST' })
    } finally {
      setResendingId(null)
    }
  }

  async function handleClose(outcome: 'LAUREAT' | 'INFRUCTUEUX', awardedCompanyId?: string) {
    setClosing(true)
    setError(null)
    try {
      const res = await fetch(`/api/ao/${ao.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome, awardedCompanyId }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Erreur')
        return
      }
      setAoStatus(outcome === 'LAUREAT' ? 'AWARDED' : 'INFRUCTUEUX')
      setCloseModalOpen(false)
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
                onClick={openNotifyModal}
                variant="outline"
                className="text-sm"
                style={{ borderColor: notifySuccess ? 'var(--green)' : 'var(--border)', color: notifySuccess ? 'var(--green)' : 'var(--text2)' }}
              >
                <Bell size={14} className="mr-1.5" />
                {notifySuccess ? 'Envoyé !' : 'Notifier'}
              </Button>
            )}
            {!isClosed && (
              <Button
                onClick={() => setCloseModalOpen(true)}
                variant="outline"
                className="text-sm"
                style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
              >
                <XCircle size={15} className="mr-1.5" />
                Clôturer l&apos;AO
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
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {statusBadge(c.status)}
                      {c.dirigeantNameMatch === false && (
                        <span title="Signataire différent du dirigeant data.gouv.fr">
                          <ShieldAlert size={14} style={{ color: 'var(--amber)' }} />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.offer?.submittedAt ? (
                      <span style={{ color: 'var(--green)' }}>
                        {new Date(c.offer.submittedAt).toLocaleDateString('fr-FR')}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text3)' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {c.portalUrl && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); void handleCopyLink(c.id, c.portalUrl!) }}
                            title="Copier le lien portail"
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                            style={{ color: copiedId === c.id ? 'var(--green)' : 'var(--text2)', background: 'var(--surface2)' }}
                          >
                            <Copy size={12} />
                            {copiedId === c.id ? 'Copié' : 'Lien'}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); void handleResend(c.id) }}
                            title="Renvoyer l'invitation par email"
                            disabled={resendingId === c.id}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                            style={{ color: 'var(--text2)', background: 'var(--surface2)' }}
                          >
                            <Send size={12} />
                            {resendingId === c.id ? '...' : 'Renvoyer'}
                          </button>
                        </>
                      )}
                      <ChevronRight size={15} style={{ color: 'var(--text3)' }} />
                    </div>
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

      {/* Modal de notification amendement */}
      {notifyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => !notifying && setNotifyModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-[var(--radius-lg)] p-6"
            style={{ background: '#fff', boxShadow: 'var(--shadow-md)', margin: '0 16px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
                Notifier les entreprises
              </h2>
              <button onClick={() => !notifying && setNotifyModalOpen(false)} style={{ color: 'var(--text3)' }}>
                <X size={18} />
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--text2)' }}>
              Sélectionnez les entreprises à notifier des modifications du dossier.
            </p>

            {/* Tout sélectionner / désélectionner */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: 'var(--text2)' }}>
                {notifySelectedIds.size} / {companies.filter((c) => c.status !== 'INCOMPLETE').length} sélectionnée(s)
              </span>
              <button
                className="text-xs"
                style={{ color: 'var(--green)' }}
                onClick={() => {
                  const active = companies.filter((c) => c.status !== 'INCOMPLETE').map((c) => c.id)
                  if (notifySelectedIds.size === active.length) setNotifySelectedIds(new Set())
                  else setNotifySelectedIds(new Set(active))
                }}
              >
                {notifySelectedIds.size === companies.filter((c) => c.status !== 'INCOMPLETE').length
                  ? 'Tout désélectionner'
                  : 'Tout sélectionner'}
              </button>
            </div>

            {/* Liste entreprises */}
            <div
              className="rounded-[var(--radius)] divide-y overflow-y-auto mb-5"
              style={{ border: '1px solid var(--border)', maxHeight: '300px' }}
            >
              {companies
                .filter((c) => c.status !== 'INCOMPLETE')
                .map((c) => {
                  const name = c.companyUser?.agency?.name ?? c.companyUser?.email ?? '—'
                  const email = c.companyUser?.email ?? ''
                  const checked = notifySelectedIds.has(c.id)
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--surface2)] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleNotifyCompany(c.id)}
                        className="rounded"
                        style={{ accentColor: 'var(--green)', width: 16, height: 16, flexShrink: 0 }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{name}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--text3)' }}>{email}</p>
                      </div>
                      <div className="ml-auto flex-shrink-0">
                        {statusBadge(c.status)}
                      </div>
                    </label>
                  )
                })}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setNotifyModalOpen(false)}
                disabled={notifying}
                className="text-sm px-4 py-2 rounded-lg"
                style={{ color: 'var(--text2)' }}
              >
                Annuler
              </button>
              <button
                onClick={() => void handleNotify()}
                disabled={notifying || notifySelectedIds.size === 0}
                className="text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
                style={{ background: 'var(--green-btn)', color: '#fff' }}
              >
                <Bell size={14} className="inline mr-1.5" />
                {notifying ? 'Envoi...' : `Notifier (${notifySelectedIds.size})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de clôture */}
      {closeModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => !closing && setCloseModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-[var(--radius-lg)] p-6"
            style={{ background: '#fff', boxShadow: 'var(--shadow-md)', margin: '0 16px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
                  Clôturer l&apos;appel d&apos;offre
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text2)' }}>
                  Choisissez le résultat de la consultation
                </p>
              </div>
              <button onClick={() => !closing && setCloseModalOpen(false)} style={{ color: 'var(--text3)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Options */}
            <div className="space-y-3 mb-5">
              {/* Option : Déclarer un lauréat */}
              <button
                className="w-full text-left p-4 rounded-[var(--radius)] border-2 transition-all"
                style={{
                  borderColor: closeOutcome === 'LAUREAT' ? 'var(--green)' : 'var(--border)',
                  background: closeOutcome === 'LAUREAT' ? 'var(--green-light)' : 'var(--surface)',
                }}
                onClick={() => { setCloseOutcome('LAUREAT'); setSelectedLaureatId(null) }}
              >
                <div className="flex items-center gap-3 mb-1">
                  <Trophy size={18} style={{ color: closeOutcome === 'LAUREAT' ? 'var(--green)' : 'var(--text3)' }} />
                  <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>
                    Déclarer un lauréat
                  </span>
                </div>
                <p className="text-xs ml-9" style={{ color: 'var(--text2)' }}>
                  Désignez l&apos;entreprise retenue pour ce marché.
                </p>
                {closeOutcome === 'LAUREAT' && (
                  <div className="mt-3 ml-9" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={selectedLaureatId ?? ''}
                      onChange={(e) => setSelectedLaureatId(e.target.value || null)}
                      className="w-full text-sm rounded-[var(--radius)] px-3 py-2"
                      style={{ border: '1px solid var(--border)', background: '#fff', color: 'var(--text)' }}
                    >
                      <option value="">— Sélectionner une entreprise —</option>
                      {companies
                        .filter((c) => c.status === 'SUBMITTED')
                        .map((c) => {
                          const name =
                            c.companyUser?.agency?.name ??
                            ([c.companyUser?.firstName, c.companyUser?.lastName].filter(Boolean).join(' ') || c.companyUser?.email) ??
                            'Entreprise'
                          return <option key={c.id} value={c.id}>{name}</option>
                        })}
                    </select>
                    {companies.filter((c) => c.status === 'SUBMITTED').length === 0 && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text3)' }}>
                        Aucune offre soumise — vous pouvez tout de même clôturer.
                      </p>
                    )}
                  </div>
                )}
              </button>

              {/* Option : AO infructueux */}
              <button
                className="w-full text-left p-4 rounded-[var(--radius)] border-2 transition-all"
                style={{
                  borderColor: closeOutcome === 'INFRUCTUEUX' ? 'var(--text2)' : 'var(--border)',
                  background: closeOutcome === 'INFRUCTUEUX' ? 'var(--surface2)' : 'var(--surface)',
                }}
                onClick={() => { setCloseOutcome('INFRUCTUEUX'); setSelectedLaureatId(null) }}
              >
                <div className="flex items-center gap-3 mb-1">
                  <Ban size={18} style={{ color: closeOutcome === 'INFRUCTUEUX' ? 'var(--text2)' : 'var(--text3)' }} />
                  <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>
                    Déclarer l&apos;AO infructueux
                  </span>
                </div>
                <p className="text-xs ml-9" style={{ color: 'var(--text2)' }}>
                  Aucune offre n&apos;est retenue. Le marché n&apos;aboutit pas.
                </p>
              </button>
            </div>

            {error && (
              <p className="text-sm mb-4 px-3 py-2 rounded" style={{ background: 'var(--red-light)', color: 'var(--red)' }}>
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => !closing && setCloseModalOpen(false)}
                className="px-4 py-2 text-sm rounded-lg"
                style={{ background: 'var(--surface2)', color: 'var(--text2)' }}
                disabled={closing}
              >
                Annuler
              </button>
              <button
                disabled={!closeOutcome || closing || (closeOutcome === 'LAUREAT' && !selectedLaureatId && companies.filter((c) => c.status === 'SUBMITTED').length > 0)}
                onClick={() => {
                  if (!closeOutcome) return
                  void handleClose(
                    closeOutcome,
                    closeOutcome === 'LAUREAT' ? (selectedLaureatId ?? undefined) : undefined
                  )
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                style={{
                  background: closeOutcome === 'INFRUCTUEUX' ? 'var(--text2)' : 'var(--red)',
                  color: '#fff',
                }}
              >
                {closing ? 'Clôture...' : 'Confirmer la clôture'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
