'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    cabinetName: '',
    city: '',
    message: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
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
          {!submitted && (
            <p className="mt-1 text-sm" style={{ color: 'var(--text2)' }}>
              Demandez votre accès à la plateforme
            </p>
          )}
        </div>

        {submitted ? (
          <div className="text-center space-y-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
              style={{ background: 'var(--green-light)' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--green)' }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
              Merci, {form.firstName} !
            </h2>
            <p className="text-sm" style={{ color: 'var(--text2)' }}>
              Votre demande d&apos;accès a bien été enregistrée. Nous reviendrons vers vous sous <strong>48h</strong>.
            </p>
            <p className="text-sm" style={{ color: 'var(--text3)' }}>
              Un email de confirmation vous a été envoyé à <strong>{form.email}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" style={{ color: 'var(--text)' }}>Prénom</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="Jean"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" style={{ color: 'var(--text)' }}>Nom</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Dupont"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" style={{ color: 'var(--text)' }}>Email professionnel</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="vous@cabinet.fr"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cabinetName" style={{ color: 'var(--text)' }}>Nom du cabinet</Label>
              <Input
                id="cabinetName"
                name="cabinetName"
                placeholder="Studio Dupont Architecture"
                value={form.cabinetName}
                onChange={handleChange}
                required
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="city" style={{ color: 'var(--text)' }}>Ville</Label>
              <Input
                id="city"
                name="city"
                placeholder="Paris"
                value={form.city}
                onChange={handleChange}
                required
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="message" style={{ color: 'var(--text)' }}>
                Parlez-nous de votre usage{' '}
                <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optionnel)</span>
              </Label>
              <Textarea
                id="message"
                name="message"
                placeholder="Comment gérez-vous vos DPGF aujourd'hui ? Quel est votre principal défi ?"
                value={form.message}
                onChange={handleChange}
                rows={3}
                style={{ borderColor: 'var(--border)', color: 'var(--text)', resize: 'none' }}
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
              {loading ? 'Envoi en cours...' : 'Demander l\'accès'}
            </Button>
          </form>
        )}

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
