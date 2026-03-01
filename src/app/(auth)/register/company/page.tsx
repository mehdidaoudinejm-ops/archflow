'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function RegisterCompanyForm() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const token = searchParams.get('token')

  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [password, setPassword] = useState('')
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
        body: JSON.stringify({ token, firstName, lastName, companyName, password }),
      })

      const data = await res.json() as { error?: string; email?: string }

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

      // 3. Rediriger vers le portail (reconstruit depuis le token, sera géré par le portail)
      router.push('/dashboard')
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
            <Label htmlFor="password" style={{ color: 'var(--text)' }}>Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 8 caractères"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            />
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
