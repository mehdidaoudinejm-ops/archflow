'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Check, ShieldCheck, ShieldAlert, ShieldOff, AlertCircle } from 'lucide-react'
import { PortalShell } from '@/components/portal/PortalShell'

interface AgencyData {
  id: string
  name: string
  siret: string | null
  siretVerified: boolean
  legalForm: string | null
  legalFormDeclared: string | null
  companyAddress: string | null
  postalCode: string | null
  city: string | null
  country: string | null
  phone: string | null
  trade: string | null
  signatoryQuality: string | null
  logoUrl: string | null
}

interface Props {
  aoId: string
  aoName: string
  deadline: string
  token: string
  user: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
  }
  agency: AgencyData | null
}

const TRADES = [
  "TCE (Tous Corps d'État)",
  'Gros œuvre',
  'Plâtrerie',
  'Électricité',
  'Plomberie',
  'Menuiserie',
  'Peinture',
  'Revêtements',
  'Chauffage',
  'Façade',
  'Espaces verts',
  'Autre',
]

function FiabiliteScore({ checks }: { checks: { label: string; ok: boolean }[] }) {
  const done = checks.filter((c) => c.ok).length
  const pct = Math.round((done / checks.length) * 100)
  const color = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)'

  return (
    <div
      className="p-5 rounded-[var(--radius-lg)] mb-6"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Fiabilité du profil</p>
        <span className="text-lg font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full mb-4" style={{ background: 'var(--surface2)' }}>
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5">
            {c.ok
              ? <ShieldCheck size={13} style={{ color: 'var(--green)', flexShrink: 0 }} />
              : <AlertCircle size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />}
            <span className="text-xs" style={{ color: c.ok ? 'var(--text)' : 'var(--text3)' }}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PortalEntrepriseClient({ aoId, aoName, deadline, token, user, agency }: Props) {
  const [firstName, setFirstName] = useState(user.firstName ?? '')
  const [lastName, setLastName] = useState(user.lastName ?? '')
  const [companyName, setCompanyName] = useState(agency?.name ?? '')
  const [siret, setSiret] = useState(agency?.siret ?? '')
  const [siretVerified, setSiretVerified] = useState(agency?.siretVerified ?? false)
  const [legalForm, setLegalForm] = useState(agency?.legalFormDeclared ?? agency?.legalForm ?? '')
  const [companyAddress, setCompanyAddress] = useState(agency?.companyAddress ?? '')
  const [postalCode, setPostalCode] = useState(agency?.postalCode ?? '')
  const [city, setCity] = useState(agency?.city ?? '')
  const [country, setCountry] = useState(agency?.country ?? 'France')
  const [phone, setPhone] = useState(agency?.phone ?? '')
  const [trade, setTrade] = useState(agency?.trade ?? '')
  const [signatoryQuality, setSignatoryQuality] = useState(agency?.signatoryQuality ?? '')

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [verifying, setVerifying] = useState(false)
  const [verifyMsg, setVerifyMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [dirigeant, setDirigeant] = useState<{ nom: string; prenoms: string } | null>(null)

  function handleSiretChange(v: string) {
    setSiret(v)
    setSiretVerified(false)
    setVerifyMsg(null)
    setDirigeant(null)
  }

  async function handleVerifySiren() {
    const clean = siret.replace(/\s/g, '')
    if (!clean || (clean.length !== 9 && clean.length !== 14)) {
      setVerifyMsg({ type: 'error', text: 'Saisissez un SIREN (9 chiffres) ou SIRET (14 chiffres)' })
      return
    }
    setVerifying(true)
    setVerifyMsg(null)
    try {
      const res = await fetch(`/api/portal/${aoId}/verify-siren?siret=${clean}`, {
        headers: { 'X-Portal-Token': token },
      })
      const data = await res.json() as {
        error?: string
        siret?: string
        companyName?: string
        legalForm?: string
        companyAddress?: string
        postalCode?: string
        city?: string
        dirigeant?: { nom: string; prenoms: string } | null
      }
      if (!res.ok) {
        setVerifyMsg({ type: 'error', text: data.error ?? 'Introuvable' })
        return
      }
      if (data.siret) setSiret(data.siret)
      if (data.companyName && !companyName) setCompanyName(data.companyName)
      if (data.legalForm && !legalForm) setLegalForm(data.legalForm)
      if (data.companyAddress && !companyAddress) setCompanyAddress(data.companyAddress)
      if (data.postalCode && !postalCode) setPostalCode(data.postalCode)
      if (data.city && !city) setCity(data.city)
      if (data.dirigeant) setDirigeant(data.dirigeant)
      setSiretVerified(true)
      setVerifyMsg({ type: 'success', text: 'Entreprise vérifiée via data.gouv.fr' })
    } catch {
      setVerifyMsg({ type: 'error', text: 'Erreur réseau' })
    } finally {
      setVerifying(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(`/api/portal/${aoId}/company`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Portal-Token': token },
        body: JSON.stringify({ firstName: firstName || null, lastName: lastName || null, companyName, siret: siret || null, legalForm: legalForm || null, companyAddress, postalCode, city, country, phone, trade, signatoryQuality }),
      })
      if (res.ok) setSaved(true)
      else {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Erreur')
      }
    } catch {
      setError('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  const checks = [
    { label: 'Raison sociale', ok: !!companyName },
    { label: 'Corps de métier', ok: !!trade },
    { label: 'Téléphone', ok: !!phone },
    { label: 'Adresse complète', ok: !!(companyAddress && city) },
    { label: 'SIRET renseigné', ok: !!siret },
    { label: 'SIRET vérifié', ok: siretVerified },
  ]

  const companyDisplay = agency?.name || user.email

  return (
    <PortalShell
      aoId={aoId}
      aoName={aoName}
      deadline={deadline}
      companyName={companyDisplay}
      activeSection="entreprise"
      progress={0}
      saveStatus="saved"
      isSubmitted={false}
    >
      <div className="max-w-2xl mx-auto py-8 px-6">
        <h1 className="text-2xl mb-6" style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--text)' }}>
          Mon entreprise
        </h1>

        <FiabiliteScore checks={checks} />

        <form onSubmit={handleSave} className="space-y-4">
          {/* Société */}
          <section className="p-6 rounded-[var(--radius-lg)]"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Société</h2>
            <div className="space-y-4">

              <div className="space-y-1.5">
                <Label style={{ color: 'var(--text)' }}>Raison sociale</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Nom de votre entreprise"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }} />
              </div>

              {/* SIREN/SIRET */}
              <div className="space-y-1.5">
                <Label style={{ color: 'var(--text)' }}>
                  SIREN / SIRET
                  {siretVerified && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--green-light)', color: 'var(--green)' }}>
                      <ShieldCheck size={11} /> Vérifié
                    </span>
                  )}
                  {siret && !siretVerified && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--amber-light)', color: 'var(--amber)' }}>
                      <ShieldAlert size={11} /> Non vérifié
                    </span>
                  )}
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={siret}
                    onChange={(e) => handleSiretChange(e.target.value)}
                    placeholder="123456789 ou 12345678900012"
                    maxLength={14}
                    style={{ borderColor: 'var(--border)', color: 'var(--text)', flex: 1 }}
                  />
                  <Button type="button" onClick={handleVerifySiren}
                    disabled={verifying || !siret.replace(/\s/g, '')}
                    variant="outline" className="shrink-0 text-sm"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                    {verifying ? 'Vérification...' : 'Vérifier'}
                  </Button>
                </div>
                {verifyMsg && (
                  <div className="flex items-start gap-2 text-xs px-3 py-2 rounded-[var(--radius)]"
                    style={{
                      background: verifyMsg.type === 'success' ? 'var(--green-light)' : 'var(--red-light)',
                      color: verifyMsg.type === 'success' ? 'var(--green)' : 'var(--red)',
                    }}>
                    {verifyMsg.type === 'success'
                      ? <ShieldCheck size={13} className="mt-0.5 shrink-0" />
                      : <ShieldOff size={13} className="mt-0.5 shrink-0" />}
                    <span>{verifyMsg.text}</span>
                  </div>
                )}
                {dirigeant && (
                  <p className="text-xs" style={{ color: 'var(--text2)' }}>
                    Dirigeant enregistré : <strong>{dirigeant.prenoms} {dirigeant.nom}</strong>
                  </p>
                )}
                <p className="text-xs" style={{ color: 'var(--text3)' }}>
                  Vérification via annuaire-entreprises.data.gouv.fr — complète automatiquement adresse et forme juridique
                </p>
              </div>

              <div className="space-y-1.5">
                <Label style={{ color: 'var(--text)' }}>Forme juridique</Label>
                <Input value={legalForm} onChange={(e) => setLegalForm(e.target.value)}
                  placeholder="SAS, SARL, EURL…"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }} />
              </div>

              <div className="space-y-1.5">
                <Label style={{ color: 'var(--text)' }}>Email</Label>
                <Input value={user.email} readOnly
                  style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--surface2)', cursor: 'not-allowed' }} />
              </div>

              <div className="space-y-1.5">
                <Label style={{ color: 'var(--text)' }}>Téléphone</Label>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="06 12 34 56 78"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }} />
              </div>

              <div className="space-y-1.5">
                <Label style={{ color: 'var(--text)' }}>Corps de métier</Label>
                <select value={trade} onChange={(e) => setTrade(e.target.value)}
                  className="w-full h-10 text-sm rounded-md px-3 outline-none"
                  style={{ border: '1px solid var(--border)', color: 'var(--text)', background: 'var(--surface)' }}>
                  <option value="">—</option>
                  {TRADES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Signataire */}
          <section className="p-6 rounded-[var(--radius-lg)]"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Signataire</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label style={{ color: 'var(--text)' }}>Prénom</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jean"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }} />
                </div>
                <div className="space-y-1.5">
                  <Label style={{ color: 'var(--text)' }}>Nom</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)}
                    placeholder="Dupont"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label style={{ color: 'var(--text)' }}>Qualité du signataire</Label>
                <select value={signatoryQuality} onChange={(e) => setSignatoryQuality(e.target.value)}
                  className="w-full h-10 text-sm rounded-md px-3 outline-none"
                  style={{ border: '1px solid var(--border)', color: 'var(--text)', background: 'var(--surface)' }}>
                  <option value="">—</option>
                  <option>Gérant</option>
                  <option>Directeur général</option>
                  <option>Directeur</option>
                  <option>Mandataire</option>
                  <option>Président</option>
                </select>
              </div>
            </div>
          </section>

          {/* Adresse */}
          <section className="p-6 rounded-[var(--radius-lg)]"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Adresse</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label style={{ color: 'var(--text)' }}>Adresse</Label>
                <Input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)}
                  placeholder="12 rue de la Paix"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label style={{ color: 'var(--text)' }}>Code postal</Label>
                  <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="75001" style={{ borderColor: 'var(--border)', color: 'var(--text)' }} />
                </div>
                <div className="space-y-1.5">
                  <Label style={{ color: 'var(--text)' }}>Ville</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)}
                    placeholder="Paris" style={{ borderColor: 'var(--border)', color: 'var(--text)' }} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label style={{ color: 'var(--text)' }}>Pays</Label>
                <Input value={country} onChange={(e) => setCountry(e.target.value)}
                  placeholder="France" style={{ borderColor: 'var(--border)', color: 'var(--text)' }} />
              </div>
            </div>
          </section>

          {error && (
            <p className="text-sm px-3 py-2 rounded-[var(--radius)]"
              style={{ background: 'var(--red-light)', color: 'var(--red)' }}>{error}</p>
          )}
          {saved && (
            <p className="text-sm px-3 py-2 rounded-[var(--radius)] flex items-center gap-1.5"
              style={{ background: 'var(--green-light)', color: 'var(--green)' }}>
              <Check size={15} /> Modifications sauvegardées
            </p>
          )}
          <Button type="submit" disabled={saving}
            style={{ background: 'var(--green-btn)', color: '#fff', border: 'none' }}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
          </Button>
        </form>
      </div>
    </PortalShell>
  )
}
