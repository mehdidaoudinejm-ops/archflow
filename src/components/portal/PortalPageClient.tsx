'use client'

import { useCallback, useRef, useState, Suspense } from 'react'
import Link from 'next/link'
import { PortalShell } from '@/components/portal/PortalShell'
import { OfferTable, getAllPostIds } from '@/components/portal/OfferTable'
import { useOffer } from '@/hooks/useOffer'
import { Button } from '@/components/ui/button'
import { AlertCircle, X, RefreshCw, Download, Upload, FileSpreadsheet, CheckCircle2, ChevronRight, Pencil } from 'lucide-react'
import type { DpgfDiff } from '@/lib/dpgf-diff'

interface Post {
  id: string
  ref: string
  title: string
  unit: string
  qtyArchi: number | null
  isOptional: boolean
  commentArchi: string | null
}

interface Lot {
  id: string
  number: number
  name: string
  vatRate: number
  posts: Post[]
}

interface AOData {
  id: string
  name: string
  deadline: string
  instructions: string | null
  allowCustomQty: boolean
  isPaid: boolean
  paymentAmount: number | null
  status: string
  lotIds: string[]
}

interface InitialOffer {
  id: string
  submittedAt: string | null
  isComplete: boolean
  lotVatRates: Record<string, number> | null
  offerPosts: Array<{
    postId: string
    unitPrice: number | null
    qtyCompany: number | null
    qtyMotive: string | null
    comment: string | null
    isVariant: boolean
    variantDescription: string | null
  }>
}

interface CompanyUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  companyName: string | null
}

interface RequiredDoc {
  type: string
  label: string
  required: boolean
}

interface PortalPageClientProps {
  ao: AOData
  lots: Lot[]
  initialOffer: InitialOffer | null
  token: string | null
  companyUser: CompanyUser
  aoCompanyId: string
  initialSelectedLotIds: string[]
  requiredDocs: RequiredDoc[] | null
  uploadedDocTypes: string[]
  diff: DpgfDiff | null
  newDocumentIds: string[]
  profileIncomplete: boolean
}

function ConfirmModal({
  lots,
  skippedLots,
  posts: offerPosts,
  allowCustomQty,
  onConfirm,
  onCancel,
  submitting,
  errors,
}: {
  lots: Lot[]
  skippedLots: Lot[]
  posts: Map<string, { unitPrice: number | null; qtyCompany: number | null }>
  allowCustomQty: boolean
  onConfirm: () => void
  onCancel: () => void
  submitting: boolean
  errors: string[]
}) {
  const [docsConfirmed, setDocsConfirmed] = useState(false)
  let grandTotal = 0

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
    >
      <div
        className="w-full max-w-lg rounded-[var(--radius-lg)] p-6"
        style={{
          background: 'var(--surface)',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border)',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
            Confirmer la soumission
          </h2>
          <button onClick={onCancel} style={{ color: 'var(--text3)' }}>
            <X size={20} />
          </button>
        </div>

        {errors.length > 0 && (
          <div
            className="mb-4 p-3 rounded-[var(--radius)]"
            style={{ background: 'var(--amber-light)', border: '1px solid var(--amber)' }}
          >
            <p className="text-sm font-medium mb-1 flex items-center gap-1" style={{ color: 'var(--amber)' }}>
              <AlertCircle size={15} />
              {errors.length} poste{errors.length > 1 ? 's' : ''} non chiffré{errors.length > 1 ? 's' : ''} — ils apparaîtront comme non proposés dans l&apos;analyse
            </p>
            <ul className="text-xs space-y-0.5 mt-1" style={{ color: 'var(--amber)' }}>
              {errors.map((e, i) => (
                <li key={i}>• {e}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-sm mb-4" style={{ color: 'var(--text2)' }}>
          Récapitulatif de votre offre :
        </p>

        <div className="space-y-2 mb-5">
          {lots.map((lot) => {
            let lotTotal = 0
            let lotComplete = true

            lot.posts.forEach((post) => {
              const op = offerPosts.get(post.id)
              const unitPrice = op?.unitPrice ?? null
              const qty = allowCustomQty && op?.qtyCompany != null ? op.qtyCompany : post.qtyArchi
              if (unitPrice !== null && qty !== null) {
                lotTotal += qty * unitPrice
                grandTotal += qty * unitPrice
              } else if (!post.isOptional) {
                lotComplete = false
              }
            })

            return (
              <div
                key={lot.id}
                className="flex items-center justify-between px-3 py-2 rounded-[var(--radius)]"
                style={{ background: 'var(--surface2)' }}
              >
                <span className="text-sm" style={{ color: 'var(--text)' }}>
                  Lot {lot.number} — {lot.name}
                </span>
                <span
                  className="text-sm font-medium tabular-nums"
                  style={{ color: lotComplete ? 'var(--text)' : 'var(--text3)' }}
                >
                  {lotComplete
                    ? `${lotTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`
                    : '—'}
                </span>
              </div>
            )
          })}

          <div
            className="flex items-center justify-between px-3 py-2.5 rounded-[var(--radius)]"
            style={{ background: 'var(--green-light)', border: '1px solid var(--green)' }}
          >
            <span className="text-sm font-semibold" style={{ color: 'var(--green)' }}>
              Total général HT
            </span>
            <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--green)' }}>
              {grandTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
            </span>
          </div>
        </div>

        {/* Lots non retenus */}
        {skippedLots.length > 0 && (
          <div className="mb-4 px-3 py-2.5 rounded-[var(--radius)]" style={{ background: 'var(--surface2)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text3)' }}>
              Lots non retenus par votre entreprise :
            </p>
            <p className="text-xs" style={{ color: 'var(--text3)' }}>
              {skippedLots.map((l) => `Lot ${l.number} — ${l.name}`).join(' · ')}
            </p>
          </div>
        )}

        {/* Checkbox confirmation documents */}
        <label className="flex items-start gap-3 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={docsConfirmed}
            onChange={(e) => setDocsConfirmed(e.target.checked)}
            className="mt-0.5 flex-shrink-0"
            style={{ width: 16, height: 16, accentColor: 'var(--green)' }}
          />
          <span className="text-sm" style={{ color: 'var(--text)' }}>
            J&apos;atteste avoir téléchargé et pris connaissance de l&apos;ensemble des documents graphiques et que les prix soumis sont définitifs.
          </span>
        </label>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            disabled={submitting || !docsConfirmed}
            className="flex-1"
            style={{
              background: docsConfirmed ? 'var(--green-btn)' : 'var(--border2)',
              color: '#fff',
              border: 'none',
            }}
          >
            {submitting ? 'Envoi...' : errors.length > 0 ? 'Soumettre quand même' : 'Confirmer et soumettre'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Excel panel ───────────────────────────────────────────────────────────────

interface ImportResult {
  total: number
  withPrice: number
  saved: number
}

function ExcelPanel({
  aoId,
  token,
  onImportSuccess,
  isSubmitted,
}: {
  aoId: string
  token: string | null
  onImportSuccess: () => void
  isSubmitted: boolean
}) {
  const [downloading, setDownloading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const authHeaders: HeadersInit = token ? { 'X-Portal-Token': token } : {}

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/portal/${aoId}/dqe-export`, { headers: authHeaders })
      if (!res.ok) { setDownloading(false); return }
      const blob = await res.blob()
      const cd = res.headers.get('Content-Disposition') ?? ''
      const match = cd.match(/filename="([^"]+)"/)
      const filename = match?.[1] ?? `DQE_${aoId}.xlsx`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignore */ }
    setDownloading(false)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportError(null)
    setImportResult(null)

    const fd = new FormData()
    fd.append('file', file)

    try {
      const res = await fetch(`/api/portal/${aoId}/dqe-import`, {
        method: 'POST',
        headers: authHeaders,
        body: fd,
      })
      const data = await res.json() as { error?: string; total?: number; withPrice?: number; saved?: number }
      if (!res.ok) {
        setImportError(data.error ?? 'Erreur lors de l\'import')
      } else {
        setImportResult({ total: data.total ?? 0, withPrice: data.withPrice ?? 0, saved: data.saved ?? 0 })
        onImportSuccess()
      }
    } catch {
      setImportError('Erreur réseau. Réessayez.')
    }
    setImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div
      className="mx-6 mt-5 p-4 rounded-[var(--radius-lg)]"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--green-light)' }}>
          <FileSpreadsheet size={15} style={{ color: 'var(--green)' }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Saisie via Excel</p>
          <p className="text-xs" style={{ color: 'var(--text3)' }}>
            Téléchargez le DQE, remplissez vos prix hors connexion, puis réimportez.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Télécharger */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius)] text-sm font-medium transition-colors disabled:opacity-60"
          style={{ background: 'var(--green-light)', color: 'var(--green)', border: '1px solid #C5DFD0' }}
        >
          <Download size={14} />
          {downloading ? 'Génération...' : 'Télécharger le DQE (Excel)'}
        </button>

        {/* Importer */}
        {!isSubmitted && (
          <label
            className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius)] text-sm font-medium cursor-pointer transition-colors ${importing ? 'opacity-60 pointer-events-none' : ''}`}
            style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            <Upload size={14} />
            {importing ? 'Import en cours...' : 'Importer le DQE complété (.xlsx)'}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
              disabled={importing}
            />
          </label>
        )}
      </div>

      {/* Résultat d'import */}
      {importResult && (
        <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-[var(--radius)]"
          style={{ background: 'var(--green-light)', border: '1px solid #C5DFD0' }}>
          <CheckCircle2 size={15} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 1 }} />
          <p className="text-sm" style={{ color: 'var(--green)' }}>
            Import réussi — <strong>{importResult.withPrice}</strong> poste{importResult.withPrice > 1 ? 's' : ''} chiffré{importResult.withPrice > 1 ? 's' : ''} sur {importResult.total}.
            {' '}La page va se recharger automatiquement.
          </p>
        </div>
      )}

      {importError && (
        <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-[var(--radius)]"
          style={{ background: 'var(--red-light)', border: '1px solid #FCA5A5' }}>
          <AlertCircle size={15} style={{ color: 'var(--red)', flexShrink: 0, marginTop: 1 }} />
          <p className="text-sm" style={{ color: 'var(--red)' }}>{importError}</p>
        </div>
      )}
    </div>
  )
}

// ── Main inner ────────────────────────────────────────────────────────────────

function PortalPageClientInner({
  ao,
  lots,
  initialOffer,
  token,
  companyUser,
  initialSelectedLotIds,
  requiredDocs,
  uploadedDocTypes,
  diff,
  newDocumentIds,
  profileIncomplete,
}: PortalPageClientProps) {
  const { posts, updatePost, lotVatRates, updateLotVatRate, saveStatus, save, submit, isSubmitted } = useOffer({
    aoId: ao.id,
    initialOffer,
    token,
  })

  // Taux TVA suggérés par l'architecte (depuis Lot.vatRate)
  const defaultLotVatRates = Object.fromEntries(lots.map((l) => [l.id, l.vatRate]))

  // ── Sélection des lots ────────────────────────────────────────────────────
  const [selectedLotIds, setSelectedLotIds] = useState<string[]>(initialSelectedLotIds)
  const [editingSelection, setEditingSelection] = useState(false)
  const [pendingLotIds, setPendingLotIds] = useState<string[]>([])
  const [savingSelection, setSavingSelection] = useState(false)
  const [selectionError, setSelectionError] = useState<string | null>(null)

  // L'entreprise n'a pas encore fait sa sélection et l'offre n'est pas soumise
  const needsLotSelection = selectedLotIds.length === 0 && !isSubmitted

  // Lots effectivement retenus pour le chiffrage
  const selectedLots = selectedLotIds.length > 0
    ? lots.filter((l) => selectedLotIds.includes(l.id))
    : lots  // si pas de sélection (offre déjà soumise avant la feature), on affiche tout

  const skippedLots = lots.filter((l) => !selectedLots.some((s) => s.id === l.id))

  function openSelectionEdit() {
    setPendingLotIds(selectedLotIds.length > 0 ? [...selectedLotIds] : lots.map((l) => l.id))
    setSelectionError(null)
    setEditingSelection(true)
  }

  function togglePendingLot(lotId: string) {
    setPendingLotIds((prev) =>
      prev.includes(lotId) ? prev.filter((id) => id !== lotId) : [...prev, lotId]
    )
  }

  async function saveSelection() {
    if (pendingLotIds.length === 0) {
      setSelectionError('Sélectionnez au moins un lot')
      return
    }
    setSavingSelection(true)
    setSelectionError(null)
    const authHeaders: HeadersInit = token ? { 'X-Portal-Token': token } : {}
    try {
      const res = await fetch(`/api/portal/${ao.id}/selected-lots`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ selectedLotIds: pendingLotIds }),
      })
      const data = await res.json() as { error?: string; selectedLotIds?: string[] }
      if (!res.ok) {
        setSelectionError(data.error ?? 'Erreur lors de la sauvegarde')
      } else {
        setSelectedLotIds(data.selectedLotIds ?? pendingLotIds)
        setEditingSelection(false)
      }
    } catch {
      setSelectionError('Erreur réseau. Réessayez.')
    }
    setSavingSelection(false)
  }

  // ── Reste de la logique ───────────────────────────────────────────────────
  // Offre précédemment soumise, ré-ouverte suite à un amendement de l'architecte
  const offerReopened = !isSubmitted && !!initialOffer?.submittedAt

  const handleImportSuccess = useCallback(() => {
    window.location.reload()
  }, [])

  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Calcul progression sur les lots sélectionnés uniquement
  const selectedPosts = selectedLots.flatMap((l) => l.posts)
  const selectedPostIds = getAllPostIds(selectedLots)
  const nonOptional = selectedPosts.filter((p) => !p.isOptional)
  const filled = nonOptional.filter((p) => {
    const op = posts.get(p.id)
    return op?.comment === '__SKIP__' || (op?.unitPrice !== null && op?.unitPrice !== undefined)
  })
  const progress = nonOptional.length ? Math.round((filled.length / nonOptional.length) * 100) : 100

  const companyName =
    companyUser.companyName ??
    [companyUser.firstName, companyUser.lastName].filter(Boolean).join(' ') ??
    companyUser.email

  const missingMandatoryDocs = (requiredDocs ?? [])
    .filter((d) => d.required && !uploadedDocTypes.includes(d.type))

  function handleSubmitRequest() {
    const errors: string[] = []
    for (const post of nonOptional) {
      const op = posts.get(post.id)
      const isSkipped = op?.comment === '__SKIP__'
      if (!isSkipped && (op?.unitPrice === null || op?.unitPrice === undefined)) {
        errors.push(`${post.ref} — ${post.title}`)
      }
    }
    setValidationErrors(errors)
    setShowModal(true)
  }

  async function handleConfirmSubmit() {
    setSubmitting(true)
    setSubmitError(null)

    const result = await submit(selectedPostIds)

    if (result.success) {
      setShowModal(false)
    } else {
      setSubmitError(result.error ?? 'Erreur inconnue')
      if (result.details) setValidationErrors(result.details)
    }
    setSubmitting(false)
  }

  // ── Écran sélection lots (première visite) ───────────────────────────────
  if (needsLotSelection || editingSelection) {
    const pending = editingSelection ? pendingLotIds : lots.map((l) => l.id)
    const setPending = editingSelection
      ? (ids: string[]) => setPendingLotIds(ids)
      : (ids: string[]) => setPendingLotIds(ids)

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: 'var(--bg)' }}>
        <div
          className="w-full max-w-lg rounded-[var(--radius-lg)] p-8"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
        >
          <h1 className="text-2xl mb-1" style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--text)' }}>
            Sélection des lots
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text2)' }}>
            Choisissez les lots sur lesquels vous souhaitez remettre une offre.
            Vous ne serez invité à chiffrer que les lots sélectionnés.
          </p>

          <div className="space-y-2 mb-6">
            {lots.map((lot) => {
              const checked = needsLotSelection
                ? pendingLotIds.length > 0 ? pendingLotIds.includes(lot.id) : true
                : pendingLotIds.includes(lot.id)
              return (
                <label
                  key={lot.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius)] cursor-pointer transition-colors"
                  style={{
                    background: checked ? 'var(--green-light)' : 'var(--surface2)',
                    border: `1px solid ${checked ? 'var(--green)' : 'var(--border)'}`,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const current = needsLotSelection && pendingLotIds.length === 0
                        ? lots.map((l) => l.id)
                        : pendingLotIds
                      const next = current.includes(lot.id)
                        ? current.filter((id) => id !== lot.id)
                        : [...current, lot.id]
                      setPendingLotIds(next)
                    }}
                    style={{ width: 16, height: 16, accentColor: 'var(--green)', flexShrink: 0 }}
                  />
                  <span className="text-sm font-medium" style={{ color: checked ? 'var(--green)' : 'var(--text)' }}>
                    Lot {lot.number} — {lot.name}
                  </span>
                  <span className="text-xs ml-auto" style={{ color: checked ? 'var(--green-mid)' : 'var(--text3)' }}>
                    {lot.posts.length} poste{lot.posts.length > 1 ? 's' : ''}
                  </span>
                </label>
              )
            })}
          </div>

          {selectionError && (
            <p className="text-sm mb-3 flex items-center gap-1" style={{ color: 'var(--red)' }}>
              <AlertCircle size={14} /> {selectionError}
            </p>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: 'var(--text3)' }}>
              {(pendingLotIds.length > 0 ? pendingLotIds : lots.map((l) => l.id)).length} lot{lots.length > 1 ? 's' : ''} sélectionné{lots.length > 1 ? 's' : ''} sur {lots.length}
            </p>
            <div className="flex gap-2">
              {editingSelection && (
                <Button
                  variant="outline"
                  onClick={() => setEditingSelection(false)}
                  disabled={savingSelection}
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  Annuler
                </Button>
              )}
              <Button
                onClick={() => {
                  if (needsLotSelection && pendingLotIds.length === 0) {
                    setPendingLotIds(lots.map((l) => l.id))
                  }
                  saveSelection()
                }}
                disabled={savingSelection}
                className="flex items-center gap-1.5"
                style={{ background: 'var(--green-btn)', color: '#fff', border: 'none' }}
              >
                {savingSelection ? 'Enregistrement...' : (
                  <>Valider ma sélection <ChevronRight size={15} /></>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <PortalShell
        aoId={ao.id}
        aoName={ao.name}
        deadline={ao.deadline}
        companyName={companyName}
        activeSection="offer"
        progress={progress}
        saveStatus={saveStatus}
        isSubmitted={isSubmitted}
        onSave={save}
      >
        {/* Banner ré-ouverture après amendement */}
        {offerReopened && (
          <div
            className="mx-6 mt-6 px-4 py-3 rounded-[var(--radius)]"
            style={{ background: 'var(--red-light)', border: '1px solid var(--red)' }}
          >
            <p className="text-sm font-medium flex items-center gap-1.5 mb-1" style={{ color: 'var(--red)' }}>
              <RefreshCw size={14} />
              Votre offre a été rouverte suite à une modification du dossier
            </p>
            <p className="text-xs" style={{ color: 'var(--text2)' }}>
              Vos prix sont conservés. Vérifiez les postes marqués <strong>Modifié</strong> ou <strong>Nouveau</strong> et re-soumettez votre offre.
            </p>
          </div>
        )}

        {/* Banner modifications DPGF */}
        {diff && diff.total > 0 && (
          <div
            className="mx-6 mt-4 px-4 py-3 rounded-[var(--radius)]"
            style={{ background: 'var(--amber-light)', border: '1px solid var(--amber)' }}
          >
            <p className="text-sm font-medium flex items-center gap-1.5 mb-2" style={{ color: 'var(--amber)' }}>
              <RefreshCw size={14} />
              {diff.total} modification{diff.total > 1 ? 's' : ''} apportée{diff.total > 1 ? 's' : ''}
              {offerReopened ? ' depuis le dernier amendement' : ' au dossier depuis votre invitation'}
            </p>
            <ul className="text-xs space-y-0.5" style={{ color: 'var(--text2)' }}>
              {diff.addedCount > 0 && <li>• <strong>{diff.addedCount} poste{diff.addedCount > 1 ? 's' : ''} ajouté{diff.addedCount > 1 ? 's' : ''}</strong> — à chiffrer</li>}
              {diff.modifiedCount > 0 && <li>• <strong>{diff.modifiedCount} poste{diff.modifiedCount > 1 ? 's' : ''} modifié{diff.modifiedCount > 1 ? 's' : ''}</strong> — vérifiez vos prix</li>}
              {diff.removedCount > 0 && <li>• <strong>{diff.removedCount} poste{diff.removedCount > 1 ? 's' : ''} supprimé{diff.removedCount > 1 ? 's' : ''}</strong> — plus à chiffrer</li>}
              {newDocumentIds.length > 0 && <li>• <strong>{newDocumentIds.length} nouveau{newDocumentIds.length > 1 ? 'x' : ''} document{newDocumentIds.length > 1 ? 's' : ''}</strong> disponible{newDocumentIds.length > 1 ? 's' : ''} dans l&apos;onglet DCE</li>}
            </ul>
          </div>
        )}

        {/* Instructions */}
        {ao.instructions && (
          <div
            className="mx-6 mt-6 px-4 py-3 rounded-[var(--radius)]"
            style={{ background: 'var(--amber-light)', border: '1px solid var(--amber)' }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--amber)' }}>
              Instructions de l&apos;architecte
            </p>
            <p className="text-sm whitespace-pre-line" style={{ color: 'var(--text)' }}>
              {ao.instructions}
            </p>
          </div>
        )}

        {profileIncomplete && !isSubmitted && (
          <div
            className="mx-6 mt-4 px-4 py-3 rounded-[var(--radius)]"
            style={{ background: 'var(--amber-light)', border: '1px solid var(--amber)' }}
          >
            <p className="text-sm font-medium flex items-center gap-1.5 mb-1" style={{ color: 'var(--amber)' }}>
              <AlertCircle size={15} />
              Profil entreprise incomplet
            </p>
            <p className="text-xs mb-2" style={{ color: 'var(--text2)' }}>
              Complétez votre profil avant de soumettre votre offre (raison sociale, SIRET, téléphone, corps de métier, adresse, ville).
            </p>
            <Link
              href={`/portal/${ao.id}/entreprise${token ? `?token=${token}` : ''}`}
              className="inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-[var(--radius)] transition-colors"
              style={{ background: 'var(--amber)', color: '#fff' }}
            >
              Compléter mon entreprise
            </Link>
          </div>
        )}

        {missingMandatoryDocs.length > 0 && !isSubmitted && (
          <div
            className="mx-6 mt-4 px-4 py-3 rounded-[var(--radius)]"
            style={{ background: 'var(--amber-light)', border: '1px solid var(--amber)' }}
          >
            <p className="text-sm font-medium flex items-center gap-1.5 mb-1" style={{ color: 'var(--amber)' }}>
              <AlertCircle size={15} />
              Documents obligatoires manquants
            </p>
            <p className="text-xs mb-1" style={{ color: 'var(--text2)' }}>
              Vous devez déposer les documents suivants avant de soumettre votre offre :
            </p>
            <ul className="text-xs space-y-0.5" style={{ color: 'var(--amber)' }}>
              {missingMandatoryDocs.map((d) => (
                <li key={d.type}>• {d.label}</li>
              ))}
            </ul>
          </div>
        )}

        {submitError && (
          <div
            className="mx-6 mt-4 px-4 py-3 rounded-[var(--radius)]"
            style={{ background: 'var(--red-light)', color: 'var(--red)' }}
          >
            <p className="text-sm flex items-center gap-1">
              <AlertCircle size={15} />
              {submitError}
            </p>
          </div>
        )}

        {/* Récapitulatif sélection lots */}
        {!isSubmitted && selectedLots.length > 0 && (
          <div
            className="mx-6 mt-5 flex items-center justify-between px-4 py-2.5 rounded-[var(--radius)]"
            style={{ background: 'var(--green-light)', border: '1px solid #C5DFD0' }}
          >
            <div>
              <span className="text-xs font-medium" style={{ color: 'var(--green)' }}>
                Lots retenus :
              </span>{' '}
              <span className="text-xs" style={{ color: 'var(--green-mid)' }}>
                {selectedLots.map((l) => `Lot ${l.number}`).join(', ')}
              </span>
              {skippedLots.length > 0 && (
                <span className="text-xs ml-2" style={{ color: 'var(--text3)' }}>
                  · Non retenus : {skippedLots.map((l) => `Lot ${l.number}`).join(', ')}
                </span>
              )}
            </div>
            <button
              onClick={openSelectionEdit}
              className="flex items-center gap-1 text-xs font-medium ml-4 flex-shrink-0"
              style={{ color: 'var(--green)' }}
            >
              <Pencil size={11} /> Modifier
            </button>
          </div>
        )}

        {/* Mode Excel */}
        <ExcelPanel
          aoId={ao.id}
          token={token}
          onImportSuccess={handleImportSuccess}
          isSubmitted={isSubmitted}
        />

        <OfferTable
          lots={selectedLots}
          posts={posts}
          updatePost={updatePost}
          lotVatRates={lotVatRates}
          onUpdateLotVatRate={updateLotVatRate}
          defaultLotVatRates={defaultLotVatRates}
          allowCustomQty={ao.allowCustomQty}
          aoStatus={ao.status}
          isSubmitted={isSubmitted}
          onSubmitRequest={handleSubmitRequest}
          submitDisabled={missingMandatoryDocs.length > 0 || profileIncomplete}
          diffMap={diff?.postDiffs ?? null}
          removedPosts={diff?.removedPosts ?? []}
          newDocumentIds={newDocumentIds}
        />
      </PortalShell>

      {showModal && (
        <ConfirmModal
          lots={selectedLots}
          skippedLots={skippedLots}
          posts={posts}
          allowCustomQty={ao.allowCustomQty}
          onConfirm={handleConfirmSubmit}
          onCancel={() => setShowModal(false)}
          submitting={submitting}
          errors={validationErrors}
        />
      )}
    </>
  )
}

export function PortalPageClient(props: PortalPageClientProps) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}>
        <p style={{ color: 'var(--text2)' }}>Chargement...</p>
      </div>
    }>
      <PortalPageClientInner {...props} />
    </Suspense>
  )
}
