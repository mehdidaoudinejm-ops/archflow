'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

function getPasswordStrength(pw: string): number {
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}

const STRENGTH_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e']
const STRENGTH_LABELS = ['Faible', 'Moyen', 'Bon', 'Excellent']

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  required,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  autoComplete?: string
}) {
  const [focused, setFocused] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPwd ? 'text' : 'password') : type

  return (
    <div>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: '#6B6B65', marginBottom: 5 }}>
        {label}
        {required && <span style={{ color: '#9B1C1C', marginLeft: 2 }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            border: focused ? '1.5px solid #1A5C3A' : '1.5px solid #E0E0DA',
            borderRadius: 12,
            padding: isPassword ? '11px 40px 11px 14px' : '11px 14px',
            fontSize: 14,
            color: '#1A1A18',
            background: '#fff',
            outline: 'none',
            boxShadow: focused ? '0 0 0 3px rgba(26,92,58,0.08)' : 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              color: '#9B9B94', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center',
            }}
          >
            {showPwd
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            }
          </button>
        )}
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ minHeight: '100vh', background: '#F8F8F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B6B65', fontSize: 14 }}>Vérification du lien...</p>
    </div>
  )
}

function InvalidState() {
  return (
    <div style={{ minHeight: '100vh', background: '#F8F8F6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.10)', padding: '48px 40px', textAlign: 'center', maxWidth: 400 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FEE8E8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 20, color: '#9B1C1C' }}>
          ✕
        </div>
        <p style={{ fontFamily: '"DM Serif Display", serif', fontSize: 22, color: '#1A1A18', marginBottom: 10 }}>
          Lien invalide ou expiré
        </p>
        <p style={{ color: '#6B6B65', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          Ce lien d&apos;invitation n&apos;est plus valable (validité 7 jours).<br />
          Demandez à votre architecte de vous renvoyer une invitation.
        </p>
      </div>
    </div>
  )
}

interface TokenInfo {
  email: string
  agencyName: string
}

function CollaboratorForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [tokenInvalid, setTokenInvalid] = useState(false)
  const [checkingToken, setCheckingToken] = useState(true)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) { setTokenInvalid(true); setCheckingToken(false); return }
    // Verify token by calling the register endpoint with a GET-like pre-check
    // We decode the JWT locally to get the email (it's not sensitive data in the payload)
    try {
      const parts = token.split('.')
      if (parts.length !== 3) throw new Error('invalid')
      const payload = JSON.parse(atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/'))) as {
        email?: string
        agencyId?: string
        exp?: number
      }
      if (!payload.email || !payload.agencyId) throw new Error('invalid')
      if (payload.exp && payload.exp < Date.now() / 1000) throw new Error('expired')

      // Fetch agency name
      fetch(`/api/auth/collaborator-token-info?token=${encodeURIComponent(token)}`)
        .then((r) => { if (!r.ok) throw new Error(); return r.json() as Promise<TokenInfo> })
        .then((data) => setTokenInfo(data))
        .catch(() => setTokenInvalid(true))
        .finally(() => setCheckingToken(false))
    } catch {
      setTokenInvalid(true)
      setCheckingToken(false)
    }
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register-collaborator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, firstName, lastName, password }),
      })
      const data = await res.json() as { error?: string; email?: string }
      if (!res.ok) { setError(data.error ?? 'Erreur lors de la création du compte'); setLoading(false); return }

      const supabase = createBrowserClient()
      await supabase.auth.signInWithPassword({ email: tokenInfo!.email, password })
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Une erreur est survenue. Réessayez.')
      setLoading(false)
    }
  }

  const pwStrength = getPasswordStrength(password)

  if (checkingToken) return <LoadingState />
  if (tokenInvalid) return <InvalidState />

  return (
    <div style={{ minHeight: '100vh', background: '#F8F8F6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
      <div style={{ width: '100%', maxWidth: 840, borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 48px rgba(0,0,0,0.12)', display: 'flex' }}>

        {/* LEFT */}
        <div style={{ width: '40%', background: '#1A5C3A', padding: '48px 36px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ fontFamily: '"DM Serif Display", serif', fontSize: 26, color: '#fff', marginBottom: 32 }}>
            ArchFlow
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 100, padding: '6px 14px', marginBottom: 28, width: 'fit-content' }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>Invitation collaborateur</span>
          </div>

          <div style={{ fontFamily: '"DM Serif Display", serif', fontSize: 26, color: '#fff', lineHeight: 1.3, marginBottom: 14 }}>
            Rejoignez{' '}
            <em style={{ opacity: 0.75 }}>{tokenInfo?.agencyName ?? 'votre équipe'}</em>
          </div>

          <p style={{ color: 'rgba(255,255,255,0.68)', fontSize: 14, lineHeight: 1.75, marginBottom: 'auto' }}>
            Vous avez été invité à collaborer sur ArchFlow. Créez votre compte pour accéder aux projets et DPGF de votre agence.
          </p>

          <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12, marginTop: 36 }}>
            © 2026 ArchFlow · Hébergé en Europe 🇪🇺
          </p>
        </div>

        {/* RIGHT */}
        <div style={{ flex: 1, background: '#fff', padding: '48px 44px', overflowY: 'auto', maxHeight: '100vh' }}>
          <h1 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 28, color: '#1A1A18', margin: '0 0 6px' }}>
            Créer mon compte
          </h1>
          <p style={{ color: '#9B9B94', fontSize: 14, marginBottom: 28 }}>
            Renseignez vos informations pour rejoindre votre équipe.
          </p>

          {/* Email badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#EAF3ED', border: '1px solid #C5DFD0', borderRadius: 12, padding: '10px 14px', marginBottom: 28 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1A5C3A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15 }}>
              ✉
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, color: '#6B9E7A', margin: '0 0 1px' }}>Compte associé à</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A18', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tokenInfo?.email}
              </p>
            </div>
            <span style={{ color: '#1A5C3A', fontWeight: 700, fontSize: 16 }}>✓</span>
          </div>

          <form onSubmit={handleSubmit}>
            <p style={{ fontSize: 10.5, fontWeight: 600, color: '#9B9B94', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
              Votre identité
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <InputField label="Prénom" value={firstName} onChange={setFirstName} required />
              <InputField label="Nom" value={lastName} onChange={setLastName} required />
            </div>

            <div style={{ height: 1, background: '#F3F3F0', margin: '4px 0 22px' }} />

            <p style={{ fontSize: 10.5, fontWeight: 600, color: '#9B9B94', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
              Sécurité
            </p>
            <div style={{ marginBottom: 24 }}>
              <InputField
                label="Mot de passe"
                value={password}
                onChange={setPassword}
                type="password"
                required
                autoComplete="new-password"
              />
              {password.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i < pwStrength ? STRENGTH_COLORS[pwStrength - 1] : '#E8E8E3', transition: 'background 0.2s' }} />
                    ))}
                  </div>
                  {pwStrength > 0 && (
                    <p style={{ fontSize: 11, color: STRENGTH_COLORS[pwStrength - 1], marginTop: 4 }}>
                      {STRENGTH_LABELS[pwStrength - 1]}
                    </p>
                  )}
                </div>
              )}
              <p style={{ fontSize: 12, color: '#9B9B94', marginTop: 7 }}>Minimum 8 caractères avec majuscules et chiffres</p>
            </div>

            {error && (
              <div style={{ background: '#FEE8E8', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
                <p style={{ color: '#9B1C1C', fontSize: 13, margin: 0 }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: loading ? '#6B9E7A' : '#1F6B44',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '13px 20px',
                fontSize: 15,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                marginBottom: 16,
              }}
            >
              {loading ? 'Création en cours...' : 'Rejoindre mon équipe →'}
            </button>

            <p style={{ fontSize: 12, color: '#9B9B94', textAlign: 'center', lineHeight: 1.6 }}>
              En créant votre compte, vous acceptez nos{' '}
              <a href="/cgu" style={{ color: '#1A5C3A', textDecoration: 'underline' }}>Conditions d&apos;utilisation</a>.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function RegisterCollaboratorPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CollaboratorForm />
    </Suspense>
  )
}
