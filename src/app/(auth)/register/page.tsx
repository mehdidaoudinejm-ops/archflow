'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    cabinetName: '',
    city: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json() as { error?: string }

      if (!res.ok) {
        setError(data.error ?? 'Une erreur est survenue')
        return
      }

      setSubmitted(true)
    } catch {
      setError('Une erreur est survenue. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = { borderColor: 'var(--border)', color: 'var(--text)' }

  if (submitted) {
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
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--green-light)' }}
          >
            <span style={{ color: 'var(--green)', fontSize: 22 }}>✓</span>
          </div>
          <h2
            className="text-xl font-semibold mb-2"
            style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--text)' }}
          >
            Demande envoyée
          </h2>
          <p className="text-sm" style={{ color: 'var(--text2)' }}>
            Nous examinerons votre demande et vous enverrons un lien d&apos;invitation par email
            sous 48h.
          </p>
          <Link
            href="/login"
            className="inline-block mt-6 text-sm font-medium hover:underline"
            style={{ color: 'var(--green-mid)' }}
          >
            Retour à la connexion
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
            Demandez votre accès
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" style={{ color: 'var(--text)' }}>
                Prénom
              </Label>
              <Input
                id="firstName"
                placeholder="Jean"
                value={form.firstName}
                onChange={(e) => update('firstName', e.target.value)}
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
                placeholder="Dupont"
                value={form.lastName}
                onChange={(e) => update('lastName', e.target.value)}
                required
                style={inputStyle}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" style={{ color: 'var(--text)' }}>
              Adresse email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="vous@agence.fr"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cabinetName" style={{ color: 'var(--text)' }}>
              Nom du cabinet
            </Label>
            <Input
              id="cabinetName"
              placeholder="Studio Dupont Architecture"
              value={form.cabinetName}
              onChange={(e) => update('cabinetName', e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="city" style={{ color: 'var(--text)' }}>
              Ville
            </Label>
            <Input
              id="city"
              placeholder="Paris"
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="message" style={{ color: 'var(--text)' }}>
              Message{' '}
              <span style={{ color: 'var(--text3)' }}>(optionnel)</span>
            </Label>
            <textarea
              id="message"
              placeholder="Présentez votre activité en quelques mots..."
              value={form.message}
              onChange={(e) => update('message', e.target.value)}
              rows={3}
              className="w-full rounded-[var(--radius)] px-3 py-2 text-sm resize-none focus:outline-none"
              style={{
                border: '1px solid var(--border)',
                color: 'var(--text)',
                background: 'var(--surface)',
              }}
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
            {loading ? 'Envoi...' : "Demander l'accès"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: 'var(--text2)' }}>
          Déjà un compte ?{' '}
          <Link
            href="/login"
            className="font-medium hover:underline"
            style={{ color: 'var(--green-mid)' }}
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
