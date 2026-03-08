'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

interface InviteInfo {
  email: string
  firstName: string
  lastName: string
}

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

// ─── Sub-components ──────────────────────────────────────────────────────────

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  required,
  hint,
  minLength,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  hint?: string
  minLength?: number
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
          minLength={minLength}
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
      {hint && <p style={{ fontSize: 11, color: '#9B9B94', marginTop: 4 }}>{hint}</p>}
    </div>
  )
}

function SectionTitle({ children }: { children: string }) {
  return (
    <p style={{ fontSize: 10.5, fontWeight: 600, color: '#9B9B94', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
      {children}
    </p>
  )
}

function Divider() {
  return <div style={{ height: 1, background: '#F3F3F0', margin: '4px 0 22px' }} />
}

// ─── Stepper ─────────────────────────────────────────────────────────────────

const STEPS = [
  { n: '✓', label: "Demande d'accès envoyée", done: true, active: false },
  { n: '✓', label: "Accès approuvé par l'équipe", done: true, active: false },
  { n: '3', label: 'Créer votre compte', done: false, active: true },
  { n: '4', label: 'Accéder à votre espace', done: false, active: false },
]

function Stepper() {
  return (
    <div style={{ flex: 1 }}>
      {STEPS.map((step, i) => (
        <div key={i} style={{ display: 'flex', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600,
              background: step.done ? 'rgba(255,255,255,0.18)' : step.active ? '#fff' : 'transparent',
              border: step.done || step.active ? 'none' : '1.5px solid rgba(255,255,255,0.28)',
              color: step.active ? '#1A5C3A' : '#fff',
            }}>
              {step.n}
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ width: 1.5, flex: 1, minHeight: 22, background: 'rgba(255,255,255,0.18)', margin: '4px 0' }} />
            )}
          </div>
          <div style={{ paddingBottom: i < STEPS.length - 1 ? 22 : 0, paddingTop: 3 }}>
            <p style={{
              fontSize: 13.5,
              fontWeight: step.active ? 600 : 400,
              color: step.active ? '#fff' : 'rgba(255,255,255,0.55)',
            }}>
              {step.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── States ───────────────────────────────────────────────────────────────────

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
          Ce lien d&apos;invitation n&apos;est plus valable (validité 7 jours).
        </p>
        <a href="/register" style={{ color: '#1A5C3A', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
          Demander un nouvel accès →
        </a>
      </div>
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

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
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) { setTokenInvalid(true); setCheckingToken(false); return }
    fetch(`/api/waitlist/check-invite?token=${token}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() as Promise<InviteInfo> })
      .then((data) => { setInvite(data); setFirstName(data.firstName); setLastName(data.lastName) })
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
        body: JSON.stringify({ firstName, lastName, agencyName, city, phone, password, inviteToken: token }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) { setError(data.error ?? 'Erreur lors de la création du compte'); return }

      const supabase = createBrowserClient()
      await supabase.auth.signInWithPassword({ email: invite!.email, password })
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Une erreur est survenue. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const pwStrength = getPasswordStrength(password)

  if (checkingToken) return <LoadingState />
  if (tokenInvalid) return <InvalidState />

  return (
    <div style={{ minHeight: '100vh', background: '#F8F8F6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
      <div style={{ width: '100%', maxWidth: 960, borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 48px rgba(0,0,0,0.12)', display: 'flex' }}>

        {/* ── LEFT COLUMN ───────────────────────────────────────────── */}
        <div style={{ width: '42%', background: '#1A5C3A', padding: '48px 40px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

          {/* Logo */}
          <div style={{ fontFamily: '"DM Serif Display", serif', fontSize: 26, color: '#fff', marginBottom: 32 }}>
            ArchFlow
          </div>

          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 100, padding: '6px 14px', marginBottom: 28, width: 'fit-content' }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>✓ Accès approuvé</span>
          </div>

          {/* Title */}
          <div style={{ fontFamily: '"DM Serif Display", serif', fontSize: 28, color: '#fff', lineHeight: 1.3, marginBottom: 14 }}>
            Bienvenue dans la{' '}
            <em style={{ opacity: 0.7 }}>nouvelle façon</em>
            {' '}de consulter
          </div>

          {/* Description */}
          <p style={{ color: 'rgba(255,255,255,0.68)', fontSize: 14, lineHeight: 1.75, marginBottom: 40 }}>
            Votre demande d&apos;accès a été validée par notre équipe. Créez votre compte pour accéder à votre espace ArchFlow.
          </p>

          {/* Stepper */}
          <Stepper />

          {/* Footer */}
          <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12, marginTop: 36 }}>
            © 2026 ArchFlow · Hébergé en Europe 🇪🇺
          </p>
        </div>

        {/* ── RIGHT COLUMN ──────────────────────────────────────────── */}
        <div style={{ flex: 1, background: '#fff', padding: '48px 44px', overflowY: 'auto', maxHeight: '100vh' }}>

          <h1 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 28, color: '#1A1A18', margin: '0 0 6px' }}>
            Créer mon compte
          </h1>
          <p style={{ color: '#9B9B94', fontSize: 14, marginBottom: 28 }}>
            Renseignez vos informations pour finaliser votre accès.
          </p>

          {/* Email badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#EAF3ED', border: '1px solid #C5DFD0', borderRadius: 12, padding: '10px 14px', marginBottom: 28 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1A5C3A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15 }}>
              ✉
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, color: '#6B9E7A', margin: '0 0 1px' }}>Compte associé à</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A18', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {invite?.email}
              </p>
            </div>
            <span style={{ color: '#1A5C3A', fontWeight: 700, fontSize: 16 }}>✓</span>
          </div>

          <form onSubmit={handleSubmit}>

            {/* SECTION — Identité */}
            <SectionTitle>Votre identité</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22 }}>
              <InputField label="Prénom" value={firstName} onChange={setFirstName} required />
              <InputField label="Nom" value={lastName} onChange={setLastName} required />
            </div>

            <Divider />

            {/* SECTION — Cabinet */}
            <SectionTitle>Votre cabinet</SectionTitle>
            <div style={{ marginBottom: 12 }}>
              <InputField
                label="Nom du cabinet"
                value={agencyName}
                onChange={setAgencyName}
                required
                hint="Tel qu'il apparaîtra sur vos documents"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22 }}>
              <InputField label="Ville" value={city} onChange={setCity} required />
              <InputField label="Téléphone" value={phone} onChange={setPhone} type="tel" />
            </div>

            <Divider />

            {/* SECTION — Sécurité */}
            <SectionTitle>Sécurité</SectionTitle>
            <div style={{ marginBottom: 22 }}>
              <InputField
                label="Mot de passe"
                value={password}
                onChange={setPassword}
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />

              {/* Strength bar */}
              {password.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1, height: 4, borderRadius: 4,
                          background: i < pwStrength ? STRENGTH_COLORS[pwStrength - 1] : '#E8E8E3',
                          transition: 'background 0.2s',
                        }}
                      />
                    ))}
                  </div>
                  {pwStrength > 0 && (
                    <p style={{ fontSize: 11, color: STRENGTH_COLORS[pwStrength - 1], marginTop: 4 }}>
                      {STRENGTH_LABELS[pwStrength - 1]}
                    </p>
                  )}
                </div>
              )}

              <p style={{ fontSize: 12, color: '#9B9B94', marginTop: 7 }}>
                Minimum 8 caractères avec majuscules et chiffres
              </p>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: '#FEE8E8', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
                <p style={{ color: '#9B1C1C', fontSize: 13, margin: 0 }}>{error}</p>
              </div>
            )}

            {/* Submit */}
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
              {loading ? 'Création en cours...' : 'Créer mon compte →'}
            </button>

            {/* CGU */}
            <p style={{ fontSize: 12, color: '#9B9B94', textAlign: 'center', lineHeight: 1.6 }}>
              En créant votre compte, vous acceptez nos{' '}
              <a href="#" style={{ color: '#1A5C3A', textDecoration: 'underline' }}>Conditions d&apos;utilisation</a>
              {' '}et notre{' '}
              <a href="#" style={{ color: '#1A5C3A', textDecoration: 'underline' }}>Politique de confidentialité</a>.
            </p>
          </form>
        </div>

      </div>
    </div>
  )
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────

export default function RegisterInvitePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <InviteForm />
    </Suspense>
  )
}
