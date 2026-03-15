'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SetupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/client/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }),
    })

    if (res.ok) {
      router.push(next)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erreur lors de la création du compte')
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F8F8F6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#fff',
          borderRadius: 14,
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ background: '#1A5C3A', padding: '24px 32px' }}>
          <p style={{ margin: 0, fontSize: 20, color: '#fff', fontWeight: 700 }}>ArchFlow</p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Espace client
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '32px' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600, color: '#1A1A18' }}>
            Bienvenue !
          </h1>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6B6B65', lineHeight: 1.6 }}>
            Complétez votre profil pour accéder à votre espace projet.
          </p>

          <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6B6B65', marginBottom: 6 }}>
                Prénom
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoFocus
                placeholder="Jean"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 14,
                  borderRadius: 8,
                  border: '1px solid #D4D4CC',
                  background: '#F8F8F6',
                  color: '#1A1A18',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6B6B65', marginBottom: 6 }}>
                Nom
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                placeholder="Dupont"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 14,
                  borderRadius: 8,
                  border: '1px solid #D4D4CC',
                  background: '#F8F8F6',
                  color: '#1A1A18',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <p style={{ margin: 0, fontSize: 13, color: '#9B1C1C', background: '#FEE8E8', padding: '10px 12px', borderRadius: 8 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !firstName.trim() || !lastName.trim()}
              style={{
                marginTop: 4,
                padding: '12px',
                fontSize: 14,
                fontWeight: 600,
                color: '#fff',
                background: loading ? '#9B9B94' : '#1A5C3A',
                border: 'none',
                borderRadius: 10,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Enregistrement…' : 'Accéder à mon espace projet →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ClientSetupPage() {
  return (
    <Suspense>
      <SetupForm />
    </Suspense>
  )
}
