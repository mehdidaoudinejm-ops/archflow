'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff } from 'lucide-react'

function RegisterCompanyForm() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const token = searchParams.get('token')

  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [siret, setSiret] = useState('')
  const [legalForm, setLegalForm] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('France')
  const [phone, setPhone] = useState('')
  const [trade, setTrade] = useState('')
  const [signatoryQuality, setSignatoryQuality] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Vérifier le token au chargement
  useEffect(() => {
    if (!token) {
      setTokenValid(false)
      return
    }
    // Vérification côté client simple (le vrai check se fait côté serveur)
    setTokenValid(true)
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setError(null)
    setLoading(true)

    try {
      // 1. Créer le compte via l'API
      const res = await fetch('/api/auth/register-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, firstName, lastName, companyName, siret, legalForm: legalForm || undefined, companyAddress: companyAddress || undefined, postalCode: postalCode || undefined, city: city || undefined, country: country || undefined, phone: phone || undefined, trade: trade || undefined, signatoryQuality: signatoryQuality || undefined, password }),
      })

      const data = await res.json() as { error?: string; email?: string; aoId?: string }

      if (!res.ok) {
        setError(data.error ?? 'Erreur lors de la création du compte')
        return
      }

      // 2. Se connecter automatiquement
      const supabase = createBrowserClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email!,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      // 3. Rediriger vers le portail de l'AO
      router.push(data.aoId ? `/portal/${data.aoId}` : '/mes-appels-doffres')
      router.refresh()
    } catch {
      setError('Une erreur est survenue. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div style={{ color: 'var(--text2)' }}>Vérification du lien...</div>
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div
          className="w-full max-w-md p-8 text-center rounded-[var(--radius-lg)]"
          style={{
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border)',
          }}
        >
          <h1
            className="text-3xl mb-4"
            style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--green)' }}
          >
            ArchFlow
          </h1>
          <div
            className="p-4 rounded-[var(--radius)] mb-4"
            style={{ background: 'var(--red-light)', color: 'var(--red)' }}
          >
            Ce lien n&apos;est plus valide
          </div>
          <p className="text-sm" style={{ color: 'var(--text2)' }}>
            Ce lien d&apos;invitation a expiré ou a déjà été utilisé.
            Contactez l&apos;agence qui vous a invité pour recevoir un nouveau lien.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div
        className="w-full max-w-md p-8 rounded-[var(--radius-lg)]"
        style={{
          background: 'var(--surface)',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="mb-8 text-center">
          <h1
            className="text-3xl"
            style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--green)' }}
          >
            ArchFlow
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text2)' }}>
            Créez votre compte entreprise pour répondre à l&apos;appel d&apos;offre
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="companyName" style={{ color: 'var(--text)' }}>
              Nom de la société
            </Label>
            <Input
              id="companyName"
              placeholder="SARL Dupont Électricité"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="siret" style={{ color: 'var(--text)' }}>SIRET</Label>
              <Input
                id="siret"
                placeholder="12345678901234"
                value={siret}
                onChange={(e) => setSiret(e.target.value.replace(/\D/g, '').slice(0, 14))}
                maxLength={14}
                required
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              {siret.length > 0 && siret.length < 14 && (
                <p className="text-xs" style={{ color: 'var(--red)' }}>Le SIRET est obligatoire (14 chiffres)</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="legalForm" style={{ color: 'var(--text)' }}>
                Forme juridique <span style={{ color: 'var(--text3)' }}>(optionnel)</span>
              </Label>
              <select
                id="legalForm"
                value={legalForm}
                onChange={(e) => setLegalForm(e.target.value)}
                className="w-full h-10 text-sm rounded-md px-3 outline-none"
                style={{ border: '1px solid var(--border)', color: 'var(--text)', background: 'var(--surface)' }}
              >
                <option value="">—</option>
                <option>SARL</option>
                <option>SAS</option>
                <option>SASU</option>
                <option>EURL</option>
                <option>SA</option>
                <option>EI / Auto-entrepreneur</option>
                <option>Autre</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="companyAddress" style={{ color: 'var(--text)' }}>
              Adresse <span style={{ color: 'var(--text3)' }}>(optionnel)</span>
            </Label>
            <Input
              id="companyAddress"
              placeholder="12 rue de la Paix"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="postalCode" style={{ color: 'var(--text)' }}>
                Code postal <span style={{ color: 'var(--text3)' }}>(optionnel)</span>
              </Label>
              <Input
                id="postalCode"
                placeholder="75001"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                maxLength={10}
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city" style={{ color: 'var(--text)' }}>
                Ville <span style={{ color: 'var(--text3)' }}>(optionnel)</span>
              </Label>
              <Input
                id="city"
                placeholder="Paris"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="country" style={{ color: 'var(--text)' }}>
              Pays <span style={{ color: 'var(--text3)' }}>(optionnel)</span>
            </Label>
            <Input
              id="country"
              placeholder="France"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" style={{ color: 'var(--text)' }}>
              Téléphone <span style={{ color: 'var(--text3)' }}>(optionnel)</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="06 12 34 56 78"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trade" style={{ color: 'var(--text)' }}>
              Corps de métier <span style={{ color: 'var(--text3)' }}>(optionnel)</span>
            </Label>
            <select
              id="trade"
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              className="w-full h-10 text-sm rounded-md px-3 outline-none"
              style={{ border: '1px solid var(--border)', color: 'var(--text)', background: 'var(--surface)' }}
            >
              <option value="">—</option>
              <option>TCE (Tous Corps d&apos;État)</option>
              <option>Gros œuvre</option>
              <option>Plâtrerie</option>
              <option>Électricité</option>
              <option>Plomberie</option>
              <option>Menuiserie</option>
              <option>Peinture</option>
              <option>Revêtements</option>
              <option>Chauffage</option>
              <option>Façade</option>
              <option>Espaces verts</option>
              <option>Autre</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" style={{ color: 'var(--text)' }}>Prénom</Label>
              <Input
                id="firstName"
                placeholder="Jean"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName" style={{ color: 'var(--text)' }}>Nom</Label>
              <Input
                id="lastName"
                placeholder="Dupont"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="signatoryQuality" style={{ color: 'var(--text)' }}>
              Qualité du signataire <span style={{ color: 'var(--text3)' }}>(optionnel)</span>
            </Label>
            <select
              id="signatoryQuality"
              value={signatoryQuality}
              onChange={(e) => setSignatoryQuality(e.target.value)}
              className="w-full h-10 text-sm rounded-md px-3 outline-none"
              style={{ border: '1px solid var(--border)', color: 'var(--text)', background: 'var(--surface)' }}
            >
              <option value="">—</option>
              <option>Gérant</option>
              <option>Directeur</option>
              <option>Mandataire</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" style={{ color: 'var(--text)' }}>Mot de passe</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPwd ? 'text' : 'password'}
                placeholder="Minimum 8 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                style={{ borderColor: 'var(--border)', color: 'var(--text)', paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text3)' }}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p
              className="text-sm px-3 py-2 rounded-[var(--radius)]"
              style={{ background: 'var(--red-light)', color: 'var(--red)' }}
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            style={{ background: 'var(--green-btn)', color: '#fff', border: 'none' }}
          >
            {loading ? 'Création...' : 'Créer mon compte'}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function RegisterCompanyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
          <div style={{ color: 'var(--text2)' }}>Chargement...</div>
        </div>
      }
    >
      <RegisterCompanyForm />
    </Suspense>
  )
}
