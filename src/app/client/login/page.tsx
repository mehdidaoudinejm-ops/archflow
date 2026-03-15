'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { createBrowserClient } from '@/lib/supabase'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 14,
  borderRadius: 8,
  border: '1px solid #D4D4CC',
  background: '#F8F8F6',
  color: '#1A1A18',
  outline: 'none',
  boxSizing: 'border-box',
}

function ClientLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createBrowserClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }

    // Récupérer le projet du client
    const res = await fetch('/api/client/my-project')
    if (res.ok) {
      const { projectId } = await res.json()
      router.push(next || (projectId ? `/client/${projectId}` : '/client/no-project'))
    } else {
      setError('Compte introuvable')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F8F6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: '#1A5C3A', padding: '24px 32px' }}>
          <p style={{ margin: 0, fontSize: 20, color: '#fff', fontWeight: 700 }}>ArchFlow</p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Espace client
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '32px' }}>
          <h1 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 600, color: '#1A1A18' }}>Connexion</h1>

          <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6B6B65', marginBottom: 6 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="jean@dupont.fr"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6B6B65', marginBottom: 6 }}>Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Votre mot de passe"
                style={inputStyle}
              />
            </div>

            {error && (
              <p style={{ margin: 0, fontSize: 13, color: '#9B1C1C', background: '#FEE8E8', padding: '10px 12px', borderRadius: 8 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              style={{
                marginTop: 4,
                padding: '12px',
                fontSize: 14,
                fontWeight: 600,
                color: '#fff',
                background: loading || !email || !password ? '#9B9B94' : '#1A5C3A',
                border: 'none',
                borderRadius: 10,
                cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Connexion…' : 'Se connecter →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ClientLoginPage() {
  return (
    <Suspense>
      <ClientLoginForm />
    </Suspense>
  )
}
