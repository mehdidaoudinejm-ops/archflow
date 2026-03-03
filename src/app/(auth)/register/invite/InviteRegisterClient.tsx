'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface WaitlistInfo {
  id: string
  firstName: string
  lastName: string
  email: string
  cabinetName: string
}

export function InviteRegisterClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [info, setInfo] = useState<WaitlistInfo | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [password, setPassword] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setTokenError('Lien d\'invitation manquant.')
      setLoading(false)
      return
    }

    fetch(`/api/waitlist/check-token?token=${token}`)
      .then(res => res.json())
      .then((data: WaitlistInfo & { error?: string }) => {
        if (data.error) {
          setTokenError('Ce lien d\'invitation est invalide ou a déjà été utilisé.')
        } else {
          setInfo(data)
          setAgencyName(data.cabinetName)
        }
      })
      .catch(() => setTokenError('Impossible de vérifier le lien.'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!info || !token) return

    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: info.firstName,
          lastName: info.lastName,
          agencyName,
          email: info.email,
          password,
          inviteToken: token,
        }),
      })
      const data = await res.json() as { error?: string }

      if (!res.ok) {
        setError(data.error ?? 'Erreur lors de la création du compte')
        return
      }

      // Connexion automatique
      const supabase = createBrowserClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: info.email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Une erreur est survenue. Réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p style={{ color: 'var(--text2)' }}>Vérification du lien...</p>
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
            Créez votre espace agence
          </p>
        </div>

        {tokenError ? (
          <div className="text-center space-y-4">
            <p
              className="text-sm px-4 py-3 rounded-[var(--radius)]"
              style={{ background: 'var(--red-light)', color: 'var(--red)' }}
            >
              {tokenError}
            </p>
            <p className="text-sm" style={{ color: 'var(--text2)' }}>
              Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, contactez-nous à{' '}
              <a href="mailto:hello@archflow.fr" style={{ color: 'var(--green-mid)' }}>
                hello@archflow.fr
              </a>
            </p>
          </div>
        ) : info ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label style={{ color: 'var(--text)' }}>Prénom</Label>
                <Input
                  value={info.firstName}
                  disabled
                  style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--surface2)' }}
                />
              </div>
              <div className="space-y-1.5">
                <Label style={{ color: 'var(--text)' }}>Nom</Label>
                <Input
                  value={info.lastName}
                  disabled
                  style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--surface2)' }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label style={{ color: 'var(--text)' }}>Email</Label>
              <Input
                type="email"
                value={info.email}
                disabled
                style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--surface2)' }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="agencyName" style={{ color: 'var(--text)' }}>
                Nom de l&apos;agence
              </Label>
              <Input
                id="agencyName"
                placeholder="Studio Dupont Architecture"
                value={agencyName}
                onChange={e => setAgencyName(e.target.value)}
                required
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
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
                onChange={e => setPassword(e.target.value)}
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
              disabled={submitting}
              style={{ background: 'var(--green-btn)', color: '#fff', border: 'none' }}
            >
              {submitting ? 'Création...' : 'Créer mon compte'}
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  )
}
