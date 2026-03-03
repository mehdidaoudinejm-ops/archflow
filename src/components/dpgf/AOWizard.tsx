'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, Circle, ChevronRight, ChevronLeft, Send, Plus, X } from 'lucide-react'

interface Lot {
  id: string
  number: number
  name: string
}

interface Props {
  dpgfId: string
  projectId: string
  projectName: string
  lots: Lot[]
}

interface InvitedCompany {
  email: string
  aoCompanyId: string
  type: 'NEW_COMPANY' | 'EXISTING_COMPANY'
  devLink?: string
}

const STEPS = ['Lots', 'Paramètres', 'Entreprises', 'Récapitulatif']

export function AOWizard({ dpgfId, projectId, projectName, lots }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(0)

  // Step 1 — Lots
  const [selectedLotIds, setSelectedLotIds] = useState<string[]>([])

  // Step 2 — Paramètres
  const [aoName, setAoName] = useState(`Appel d'offre — ${projectName}`)
  const [deadline, setDeadline] = useState('')
  const [instructions, setInstructions] = useState('')
  const [allowCustomQty, setAllowCustomQty] = useState(true)
  const [isPaid, setIsPaid] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [requiredDocs, setRequiredDocs] = useState([
    { type: 'kbis', label: 'Kbis', required: true },
    { type: 'decennale', label: 'Décennale', required: true },
    { type: 'rcpro', label: 'RC Pro', required: true },
    { type: 'rib', label: 'RIB', required: true },
    { type: 'urssaf', label: 'Attestation URSSAF', required: true },
  ])

  // Step 3 — Entreprises
  const [aoId, setAoId] = useState<string | null>(null)
  const [emailInput, setEmailInput] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [invitedCompanies, setInvitedCompanies] = useState<InvitedCompany[]>([])

  // Step 4 — Envoi
  const [sending, setSending] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  function toggleLot(id: string) {
    setSelectedLotIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function goToStep3() {
    // Créer l'AO en DRAFT
    setGlobalError(null)
    try {
      const res = await fetch('/api/ao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dpgfId,
          name: aoName,
          lotIds: selectedLotIds,
          deadline,
          instructions: instructions || null,
          allowCustomQty,
          isPaid,
          paymentAmount: isPaid && paymentAmount ? parseFloat(paymentAmount) : null,
          requiredDocs,
        }),
      })

      const data = await res.json() as { id?: string; error?: string }
      if (!res.ok) {
        setGlobalError(data.error ?? 'Erreur lors de la création')
        return
      }

      setAoId(data.id!)
      setStep(2)
    } catch {
      setGlobalError('Erreur réseau')
    }
  }

  async function handleInvite() {
    if (!emailInput.trim() || !aoId) return
    setInviteError(null)
    setInviting(true)

    try {
      const res = await fetch(`/api/ao/${aoId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim() }),
      })

      const data = await res.json() as { error?: string; type?: string; aoCompanyId?: string; devLink?: string }
      if (!res.ok) {
        setInviteError(data.error ?? 'Erreur lors de l\'invitation')
        return
      }

      setInvitedCompanies((prev) => [
        ...prev,
        {
          email: emailInput.trim(),
          aoCompanyId: data.aoCompanyId!,
          type: (data.type as 'NEW_COMPANY' | 'EXISTING_COMPANY') ?? 'NEW_COMPANY',
          devLink: data.devLink,
        },
      ])
      setEmailInput('')
    } catch {
      setInviteError('Erreur réseau')
    } finally {
      setInviting(false)
    }
  }

  async function handleSend() {
    if (!aoId) return
    setSending(true)
    setGlobalError(null)

    try {
      const res = await fetch(`/api/ao/${aoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SENT' }),
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setGlobalError(data.error ?? 'Erreur lors de l\'envoi')
        return
      }

      router.push(`/dpgf/${projectId}/ao/${aoId}`)
    } catch {
      setGlobalError('Erreur réseau')
    } finally {
      setSending(false)
    }
  }

  const selectedLots = lots.filter((l) => selectedLotIds.includes(l.id))
  const canGoNext1 = selectedLotIds.length > 0
  const canGoNext2 = aoName.trim() && deadline

  return (
    <div className="max-w-2xl mx-auto py-6">
      {/* Titre */}
      <div className="mb-8">
        <p className="text-sm mb-1" style={{ color: 'var(--text2)' }}>{projectName}</p>
        <h1
          className="text-2xl"
          style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--text)' }}
        >
          Nouvel appel d&apos;offre
        </h1>
      </div>

      {/* Indicateur d'étapes */}
      <div className="flex items-center mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center">
            <div className="flex items-center gap-2">
              {i < step ? (
                <CheckCircle size={20} style={{ color: 'var(--green)' }} />
              ) : i === step ? (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium text-white"
                  style={{ background: 'var(--green-btn)' }}
                >
                  {i + 1}
                </div>
              ) : (
                <Circle size={20} style={{ color: 'var(--border2)' }} />
              )}
              <span
                className="text-sm font-medium"
                style={{ color: i === step ? 'var(--text)' : i < step ? 'var(--green)' : 'var(--text3)' }}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="w-8 h-px mx-2"
                style={{ background: i < step ? 'var(--green)' : 'var(--border)' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Contenu de l'étape */}
      <div
        className="rounded-[var(--radius-lg)] p-6"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Étape 1 — Sélection des lots */}
        {step === 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text)' }}>
              Sélection des lots
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text2)' }}>
              Sélectionnez les lots que vous souhaitez inclure dans cet appel d&apos;offre.
            </p>

            {lots.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text3)' }}>
                Aucun lot dans cette DPGF. Créez d&apos;abord des lots avant de lancer un AO.
              </p>
            ) : (
              <div className="space-y-2">
                {lots.map((lot) => {
                  const selected = selectedLotIds.includes(lot.id)
                  return (
                    <button
                      key={lot.id}
                      type="button"
                      onClick={() => toggleLot(lot.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius)] text-left transition-colors"
                      style={{
                        background: selected ? 'var(--green-light)' : 'var(--surface2)',
                        border: `1px solid ${selected ? 'var(--green)' : 'var(--border)'}`,
                        cursor: 'pointer',
                      }}
                    >
                      {selected ? (
                        <CheckCircle size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
                      ) : (
                        <Circle size={18} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                      )}
                      <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>
                        Lot {lot.number} — {lot.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <Button
                onClick={() => setStep(1)}
                disabled={!canGoNext1}
                style={{
                  background: 'var(--green-btn)',
                  color: '#fff',
                  border: 'none',
                  opacity: canGoNext1 ? 1 : 0.5,
                }}
              >
                Suivant <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Étape 2 — Paramètres */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text)' }}>
              Paramètres de l&apos;appel d&apos;offre
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text2)' }}>
              Définissez les modalités de consultation.
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label style={{ color: 'var(--text)' }}>Nom de l&apos;appel d&apos;offre</Label>
                <Input
                  value={aoName}
                  onChange={(e) => setAoName(e.target.value)}
                  placeholder="Appel d'offre lots électricité + plomberie"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>

              <div className="space-y-1.5">
                <Label style={{ color: 'var(--text)' }}>Date limite de remise des offres</Label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>

              <div className="space-y-1.5">
                <Label style={{ color: 'var(--text)' }}>
                  Instructions aux entreprises{' '}
                  <span style={{ color: 'var(--text3)' }}>(optionnel)</span>
                </Label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Visite de chantier obligatoire le... Documents à fournir..."
                  rows={4}
                  className="w-full rounded-[var(--radius)] px-3 py-2 text-sm resize-none focus:outline-none"
                  style={{
                    borderColor: 'var(--border)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    background: 'var(--surface)',
                  }}
                />
              </div>

              <div className="flex items-center gap-3 py-3 px-4 rounded-[var(--radius)]"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <input
                  type="checkbox"
                  id="allowCustomQty"
                  checked={allowCustomQty}
                  onChange={(e) => setAllowCustomQty(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="allowCustomQty" className="text-sm" style={{ color: 'var(--text)' }}>
                  Autoriser les entreprises à modifier les quantités
                </label>
              </div>

              <div className="flex items-center gap-3 py-3 px-4 rounded-[var(--radius)]"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <input
                  type="checkbox"
                  id="isPaid"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="isPaid" className="text-sm" style={{ color: 'var(--text)' }}>
                  Appel d&apos;offre payant
                </label>
              </div>

              {isPaid && (
                <div className="space-y-1.5 pl-7">
                  <Label style={{ color: 'var(--text)' }}>Montant (€ HT)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="150.00"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)', maxWidth: '200px' }}
                  />
                </div>
              )}

              {/* Documents administratifs demandés */}
              <div className="pt-2">
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  Documents administratifs demandés
                </p>
                <div className="space-y-2">
                  {requiredDocs.map((doc, i) => (
                    <div
                      key={doc.type}
                      className="flex items-center justify-between px-4 py-2.5 rounded-[var(--radius)]"
                      style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
                    >
                      <span className="text-sm" style={{ color: 'var(--text)' }}>{doc.label}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setRequiredDocs((prev) =>
                            prev.map((d, j) => j === i ? { ...d, required: !d.required } : d)
                          )
                        }
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
            </div>

            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setStep(0)}
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <ChevronLeft size={16} className="mr-1" /> Retour
              </Button>
              <Button
                onClick={goToStep3}
                disabled={!canGoNext2}
                style={{
                  background: 'var(--green-btn)',
                  color: '#fff',
                  border: 'none',
                  opacity: canGoNext2 ? 1 : 0.5,
                }}
              >
                Suivant <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>

            {globalError && (
              <p className="text-sm mt-3 px-3 py-2 rounded-[var(--radius)]"
                style={{ background: 'var(--red-light)', color: 'var(--red)' }}>
                {globalError}
              </p>
            )}
          </div>
        )}

        {/* Étape 3 — Invitation entreprises */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text)' }}>
              Inviter les entreprises
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text2)' }}>
              Saisissez l&apos;email de chaque entreprise à consulter. Un email d&apos;invitation leur sera envoyé.
            </p>

            {/* Champ d'invitation */}
            <div className="flex gap-2 mb-4">
              <Input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleInvite())}
                placeholder="email@entreprise.fr"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <Button
                onClick={handleInvite}
                disabled={inviting || !emailInput.trim()}
                style={{ background: 'var(--green-btn)', color: '#fff', border: 'none', flexShrink: 0 }}
              >
                <Plus size={16} className="mr-1" />
                {inviting ? 'Envoi...' : 'Inviter'}
              </Button>
            </div>

            {inviteError && (
              <p className="text-sm mb-3 px-3 py-2 rounded-[var(--radius)]"
                style={{ background: 'var(--red-light)', color: 'var(--red)' }}>
                {inviteError}
              </p>
            )}

            {/* Liste des entreprises invitées */}
            {invitedCompanies.length > 0 && (
              <div className="space-y-2 mb-4">
                {invitedCompanies.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-3 rounded-[var(--radius)]"
                    style={{ background: 'var(--green-light)', border: '1px solid var(--green)' }}
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} style={{ color: 'var(--green)', flexShrink: 0 }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                          {c.email}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{
                            background: c.type === 'NEW_COMPANY' ? 'var(--amber-light)' : 'var(--green-light)',
                            color: c.type === 'NEW_COMPANY' ? 'var(--amber)' : 'var(--green)',
                          }}
                        >
                          {c.type === 'NEW_COMPANY' ? 'Nouveau compte' : 'Compte existant'}
                        </span>
                      </div>
                      {c.devLink && (
                        <div className="ml-6 flex items-center gap-2">
                          <span className="text-xs font-mono px-2 py-1 rounded truncate max-w-xs"
                            style={{ background: 'var(--surface)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
                            {c.devLink}
                          </span>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(c.devLink!)}
                            className="text-xs flex-shrink-0"
                            style={{ color: 'var(--green)' }}
                          >
                            Copier
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {invitedCompanies.length === 0 && (
              <div
                className="text-center py-8 rounded-[var(--radius)]"
                style={{ background: 'var(--surface2)', border: '1px dashed var(--border2)' }}
              >
                <X size={24} className="mx-auto mb-2" style={{ color: 'var(--text3)' }} />
                <p className="text-sm" style={{ color: 'var(--text3)' }}>
                  Aucune entreprise invitée pour l&apos;instant
                </p>
              </div>
            )}

            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <ChevronLeft size={16} className="mr-1" /> Retour
              </Button>
              <Button
                onClick={() => setStep(3)}
                style={{ background: 'var(--green-btn)', color: '#fff', border: 'none' }}
              >
                Suivant <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Étape 4 — Récapitulatif */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text)' }}>
              Récapitulatif
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text2)' }}>
              Vérifiez les informations avant d&apos;envoyer l&apos;appel d&apos;offre.
            </p>

            <div className="space-y-4">
              {/* Lots */}
              <div className="p-4 rounded-[var(--radius)]" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: 'var(--text3)' }}>
                  Lots inclus
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedLots.map((l) => (
                    <span
                      key={l.id}
                      className="text-sm px-2 py-1 rounded"
                      style={{ background: 'var(--green-light)', color: 'var(--green)' }}
                    >
                      Lot {l.number} — {l.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Paramètres */}
              <div className="p-4 rounded-[var(--radius)]" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: 'var(--text3)' }}>
                  Paramètres
                </p>
                <div className="space-y-1">
                  <p className="text-sm" style={{ color: 'var(--text)' }}>
                    <span style={{ color: 'var(--text2)' }}>Nom :</span>{' '}
                    <strong>{aoName}</strong>
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text)' }}>
                    <span style={{ color: 'var(--text2)' }}>Date limite :</span>{' '}
                    <strong>
                      {new Date(deadline).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </strong>
                  </p>
                  {instructions && (
                    <p className="text-sm" style={{ color: 'var(--text)' }}>
                      <span style={{ color: 'var(--text2)' }}>Instructions :</span>{' '}
                      {instructions}
                    </p>
                  )}
                  {isPaid && paymentAmount && (
                    <p className="text-sm" style={{ color: 'var(--text)' }}>
                      <span style={{ color: 'var(--text2)' }}>Montant AO payant :</span>{' '}
                      <strong>{parseFloat(paymentAmount).toLocaleString('fr-FR')} € HT</strong>
                    </p>
                  )}
                </div>
              </div>

              {/* Entreprises */}
              <div className="p-4 rounded-[var(--radius)]" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: 'var(--text3)' }}>
                  Entreprises invitées ({invitedCompanies.length})
                </p>
                {invitedCompanies.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--text3)' }}>
                    Aucune entreprise invitée — vous pourrez en ajouter depuis la page de suivi.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {invitedCompanies.map((c, i) => (
                      <p key={i} className="text-sm" style={{ color: 'var(--text)' }}>
                        {c.email}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {globalError && (
              <p className="text-sm mt-3 px-3 py-2 rounded-[var(--radius)]"
                style={{ background: 'var(--red-light)', color: 'var(--red)' }}>
                {globalError}
              </p>
            )}

            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <ChevronLeft size={16} className="mr-1" /> Retour
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending}
                style={{ background: 'var(--green-btn)', color: '#fff', border: 'none' }}
              >
                <Send size={16} className="mr-2" />
                {sending ? 'Envoi en cours...' : 'Envoyer l\'AO'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
