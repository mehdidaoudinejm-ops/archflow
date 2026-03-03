'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function RegisterPage() {
  const router = useRouter()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // 1. Créer le compte via l'API (Supabase Auth + Prisma)
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, agencyName, email, password }),
      })

      const data = await res.json() as { error?: string }

      if (!res.ok) {
        setError(data.error ?? 'Erreur lors de la création du compte')
        return
      }

      // 2. Se connecter automatiquement après l'inscription
      const supabase = createBrowserClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
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
      setLoading(false)
    }
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
        {/* Logo */}
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

        <form onSubmit={handleSubmit} className="space-y-5">
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
            <Label htmlFor="agencyName" style={{ color: 'var(--text)' }}>
              Nom de l&apos;agence
            </Label>
            <Input
              id="agencyName"
              placeholder="Studio Dupont Architecture"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              required
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" style={{ color: 'var(--text)' }}>Adresse email</Label>
            <Input
              id="email"
              type="email"
              placeholder="vous@agence.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            />
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

        <p className="mt-6 text-center text-sm" style={{ color: 'var(--text2)' }}>
          Déjà un compte ?{' '}
          <Link href="/login" className="font-medium hover:underline" style={{ color: 'var(--green-mid)' }}>
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
