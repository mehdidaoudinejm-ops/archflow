'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface InviteInfo {
  email: string
  firstName: string
  lastName: string
}

function InviteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [tokenInvalid, setTokenInvalid] = useState(false)
  const [checkingToken, setCheckingToken] = useState(true)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      setTokenInvalid(true)
      setCheckingToken(false)
      return
    }

    fetch(`/api/waitlist/check-invite?token=${token}`)
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json() as Promise<InviteInfo>
      })
      .then((data) => {
        setInvite(data)
        setFirstName(data.firstName)
        setLastName(data.lastName)
      })
      .catch(() => setTokenInvalid(true))
      .finally(() => setCheckingToken(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, agencyName, password, inviteToken: token }),
      })

      const data = await res.json() as { error?: string }

      if (!res.ok) {
        setError(data.error ?? 'Erreur lors de la création du compte')
        return
      }

      // Auto-connexion
      const supabase = createBrowserClient()
      await supabase.auth.signInWithPassword({
        email: invite!.email,
        password,
      })

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Une erreur est survenue. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = { borderColor: 'var(--border)', color: 'var(--text)' }

  if (checkingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p style={{ color: 'var(--text2)' }}>Vérification du lien...</p>
      </div>
    )
  }

  if (tokenInvalid) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg)' }}
      >
        <div
          className="w-full max-w-md p-8 rounded-[var(--radius-lg)] text-center"
          style={{
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border)',
          }}
        >
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--red)' }}>
            Lien invalide ou expiré
          </p>
          <p className="text-sm" style={{ color: 'var(--text2)' }}>
            Ce lien d&apos;invitation n&apos;est plus valable.
          </p>
          <Link
            href="/register"
            className="inline-block mt-4 text-sm font-medium hover:underline"
            style={{ color: 'var(--green-mid)' }}
          >
            Demander un nouvel accès
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg)' }}
    >
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
            Créez votre espace agence
          </p>
        </div>

        {/* Email (lecture seule) */}
        <div
          className="mb-5 px-3 py-2 rounded-[var(--radius)] text-sm"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)' }}
        >
          Compte associé à <strong style={{ color: 'var(--text)' }}>{invite?.email}</strong>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" style={{ color: 'var(--text)' }}>
                Prénom
              </Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName" style={{ color: 'var(--text)' }}>
                Nom
              </Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="agencyName" style={{ color: 'var(--text)' }}>
              Nom de l&apos;agence
            </Label>
            <Input
              id="agencyName"
              placeholder="Studio Dupont Architecture"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" style={{ color: 'var(--text)' }}>
              Mot de passe
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 8 caractères"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              style={inputStyle}
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

export default function RegisterInvitePage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: 'var(--bg)' }}
        >
          <p style={{ color: 'var(--text2)' }}>Chargement...</p>
        </div>
      }
    >
      <InviteForm />
    </Suspense>
  )
}
