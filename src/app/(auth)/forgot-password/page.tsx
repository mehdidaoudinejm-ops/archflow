'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createBrowserClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
      })

      if (resetError) {
        setError(resetError.message)
        return
      }

      setSent(true)
    } catch {
      setError('Une erreur est survenue. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div
        className="w-full max-w-md mx-4 p-6 sm:p-8 rounded-[var(--radius-lg)]"
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
            style={{
              fontFamily: '"DM Serif Display", serif',
              color: 'var(--green)',
            }}
          >
            ArchFlow
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text2)' }}>
            Réinitialisation du mot de passe
          </p>
        </div>

        {sent ? (
          <div
            className="text-center p-4 rounded-[var(--radius)]"
            style={{ background: 'var(--green-light)', color: 'var(--green)' }}
          >
            <p className="font-medium">Email envoyé !</p>
            <p className="text-sm mt-1">
              Vérifiez votre boîte mail et cliquez sur le lien de réinitialisation.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-sm" style={{ color: 'var(--text2)' }}>
              Saisissez votre adresse email. Nous vous enverrons un lien pour réinitialiser votre
              mot de passe.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="email" style={{ color: 'var(--text)' }}>
                Adresse email
              </Label>
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
              style={{
                background: 'var(--green-btn)',
                color: '#fff',
                border: 'none',
              }}
            >
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm" style={{ color: 'var(--text2)' }}>
          <Link
            href="/login"
            className="font-medium hover:underline"
            style={{ color: 'var(--green-mid)' }}
          >
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  )
}
