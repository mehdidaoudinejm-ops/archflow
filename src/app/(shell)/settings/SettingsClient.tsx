'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Check } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'

interface UserData {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
}

interface AgencyData {
  id: string
  name: string
  siret: string | null
  siretVerified: boolean
  companyAddress: string | null
  postalCode: string | null
  city: string | null
  phone: string | null
  trade: string | null
  signatoryQuality: string | null
  logoUrl: string | null
  plan: string
  activeModules: string[]
}

const TRADES = [
  'TCE (Tous Corps d\'État)',
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

function PasswordSection() {
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (newPwd.length < 8) { setMsg({ type: 'error', text: 'Minimum 8 caractères' }); return }
    setLoading(true)
    setMsg(null)
    const supabase = createBrowserClient()
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    setLoading(false)
    if (error) setMsg({ type: 'error', text: error.message })
    else { setMsg({ type: 'success', text: 'Mot de passe mis à jour' }); setCurrentPwd(''); setNewPwd('') }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="space-y-1.5">
        <Label style={{ color: 'var(--text)' }}>Nouveau mot de passe</Label>
        <div className="relative">
          <Input
            type={showCurrent ? 'text' : 'password'}
            placeholder="Minimum 8 caractères"
            value={currentPwd}
            onChange={(e) => setCurrentPwd(e.target.value)}
            style={{ borderColor: 'var(--border)', color: 'var(--text)', paddingRight: 40 }}
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text3)' }}
          >
            {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label style={{ color: 'var(--text)' }}>Confirmer le nouveau mot de passe</Label>
        <div className="relative">
          <Input
            type={showNew ? 'text' : 'password'}
            placeholder="Retapez le mot de passe"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            style={{ borderColor: 'var(--border)', color: 'var(--text)', paddingRight: 40 }}
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text3)' }}
          >
            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      {msg && (
        <p className="text-sm px-3 py-2 rounded-[var(--radius)]"
          style={{ background: msg.type === 'success' ? 'var(--green-light)' : 'var(--red-light)', color: msg.type === 'success' ? 'var(--green)' : 'var(--red)' }}>
          {msg.text}
        </p>
      )}
      <Button type="submit" disabled={loading || !currentPwd || !newPwd}
        style={{ background: 'var(--green-btn)', color: '#fff', border: 'none' }}>
        {loading ? 'Mise à jour...' : 'Mettre à jour'}
      </Button>
    </form>
  )
}

export function SettingsClient({ user, agency }: { user: UserData; agency: AgencyData | null }) {
  const isCompany = user.role === 'COMPANY'

  // Company editable fields
  const [companyName, setCompanyName] = useState(agency?.name ?? '')
  const [companyAddress, setCompanyAddress] = useState(agency?.companyAddress ?? '')
  const [postalCode, setPostalCode] = useState(agency?.postalCode ?? '')
  const [city, setCity] = useState(agency?.city ?? '')
  const [country, setCountry] = useState((agency as { country?: string | null } | null)?.country ?? 'France')
  const [phone, setPhone] = useState(agency?.phone ?? '')
  const [trade, setTrade] = useState(agency?.trade ?? '')
  const [signatoryQuality, setSignatoryQuality] = useState(agency?.signatoryQuality ?? '')
  const [logoUrl, setLogoUrl] = useState(agency?.logoUrl ?? '')
  const [logoUploading, setLogoUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload/logo', { method: 'POST', body: fd })
    setLogoUploading(false)
    if (res.ok) {
      const data = await res.json() as { logoUrl: string }
      setLogoUrl(data.logoUrl)
    } else {
      const data = await res.json() as { error?: string }
      setError(data.error ?? 'Erreur upload logo')
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    const endpoint = isCompany ? '/api/company/profile' : '/api/settings/agency'
    const res = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName, companyAddress, postalCode, city, country, phone, trade, signatoryQuality }),
    })

    setSaving(false)
    if (res.ok) setSaved(true)
    else {
      const data = await res.json() as { error?: string }
      setError(data.error ?? 'Erreur lors de la sauvegarde')
    }
  }

  if (!isCompany) {
    // Architect settings — read only for now
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl mb-6" style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--text)' }}>
          Paramètres
        </h1>
        <section className="p-6 rounded-[var(--radius-lg)] mb-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Agence</h2>
          <dl className="space-y-3">
            <Row label="Nom" value={agency?.name ?? '—'} />
            <Row label="Plan" value={agency?.plan ?? '—'} />
            <Row label="Modules actifs" value={agency?.activeModules.join(', ') ?? '—'} />
          </dl>
        </section>
        <section className="p-6 rounded-[var(--radius-lg)] mb-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Mon compte</h2>
          <dl className="space-y-3">
            <Row label="Prénom" value={user.firstName || '—'} />
            <Row label="Nom" value={user.lastName || '—'} />
            <Row label="Email" value={user.email} />
            <Row label="Rôle" value={user.role} />
          </dl>
        </section>
        <section className="p-6 rounded-[var(--radius-lg)]"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Sécurité</h2>
          <PasswordSection />
        </section>
      </div>
    )
  }

  // COMPANY settings — fully editable
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl mb-6" style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--text)' }}>
        Paramètres entreprise
      </h1>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Informations société */}
        <section className="p-6 rounded-[var(--radius-lg)]"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Société</h2>

          <div className="space-y-4">
            {/* Logo */}
            <div className="space-y-1.5">
              <Label style={{ color: 'var(--text)' }}>Logo</Label>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain rounded-[var(--radius)]"
                    style={{ border: '1px solid var(--border)' }} />
                ) : (
                  <div className="w-16 h-16 flex items-center justify-center rounded-[var(--radius)]"
                    style={{ border: '1px dashed var(--border2)', color: 'var(--text3)', fontSize: 11 }}>
                    Logo
                  </div>
                )}
                <div>
                  <label className="cursor-pointer">
                    <span className="text-sm px-3 py-1.5 rounded-[var(--radius)]"
                      style={{ border: '1px solid var(--border)', color: 'var(--text)', background: 'var(--surface2)' }}>
                      {logoUploading ? 'Upload...' : 'Choisir un fichier'}
                    </span>
                    <input type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                      onChange={handleLogoUpload} className="hidden" disabled={logoUploading} />
                  </label>
                  <p className="text-xs mt-1" style={{ color: 'var(--text3)' }}>PNG, JPG, SVG — max 2 Mo</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label style={{ color: 'var(--text)' }}>Raison sociale</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }} />
            </div>

            {/* SIRET — read only */}
            <div className="space-y-1.5">
              <Label style={{ color: 'var(--text)' }}>SIRET
                {agency?.siretVerified && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--green-light)', color: 'var(--green)' }}>
                    ✓ Vérifié
                  </span>
                )}
              </Label>
              <Input value={agency?.siret ?? '—'} readOnly
                style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--surface2)', cursor: 'not-allowed' }} />
              <p className="text-xs" style={{ color: 'var(--text3)' }}>Non modifiable — contactez le support si nécessaire</p>
            </div>

            {/* Email — read only */}
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

            <div className="space-y-1.5">
              <Label style={{ color: 'var(--text)' }}>Qualité du signataire</Label>
              <select value={signatoryQuality} onChange={(e) => setSignatoryQuality(e.target.value)}
                className="w-full h-10 text-sm rounded-md px-3 outline-none"
                style={{ border: '1px solid var(--border)', color: 'var(--text)', background: 'var(--surface)' }}>
                <option value="">—</option>
                <option>Gérant</option>
                <option>Directeur</option>
                <option>Mandataire</option>
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
              <Label style={{ color: 'var(--text)' }}>Adresse (numéro + rue)</Label>
              <Input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="12 rue de la Paix"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label style={{ color: 'var(--text)' }}>Code postal</Label>
                <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="75001"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }} />
              </div>
              <div className="space-y-1.5">
                <Label style={{ color: 'var(--text)' }}>Ville</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)}
                  placeholder="Paris"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: 'var(--text)' }}>Pays</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)}
                placeholder="France"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }} />
            </div>
          </div>
        </section>

        {/* Feedback + Submit */}
        {error && (
          <p className="text-sm px-3 py-2 rounded-[var(--radius)]"
            style={{ background: 'var(--red-light)', color: 'var(--red)' }}>{error}</p>
        )}
        {saved && (
          <p className="text-sm px-3 py-2 rounded-[var(--radius)] flex items-center gap-1.5"
            style={{ background: 'var(--green-light)', color: 'var(--green)' }}>
            <Check size={15} />
            Modifications sauvegardées
          </p>
        )}
        <Button type="submit" disabled={saving}
          style={{ background: 'var(--green-btn)', color: '#fff', border: 'none' }}>
          {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
        </Button>
      </form>

      {/* Sécurité */}
      <section className="p-6 rounded-[var(--radius-lg)] mt-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Sécurité</h2>
        <PasswordSection />
      </section>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
      <dt className="text-sm" style={{ color: 'var(--text3)' }}>{label}</dt>
      <dd className="text-sm font-medium" style={{ color: 'var(--text)' }}>{value}</dd>
    </div>
  )
}
