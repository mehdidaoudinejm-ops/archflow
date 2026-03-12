'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, Send, CheckCircle2, Loader2 } from 'lucide-react'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Erreur')
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    /* Overlay plein écran */
    <div
      style={{
        minHeight: '100vh',
        background: 'rgba(15, 53, 36, 0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      {/* Modal */}
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
          width: '100%',
          maxWidth: '480px',
          padding: '36px 32px',
          position: 'relative',
        }}
      >
        {/* Bouton fermer → revient à l'accueil */}
        <Link
          href="/"
          style={{
            position: 'absolute', top: 16, right: 16,
            width: 32, height: 32, borderRadius: '50%',
            background: '#F3F3F0', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#6B6B65', textDecoration: 'none',
          }}
          aria-label="Fermer"
        >
          <X size={16} />
        </Link>

        {sent ? (
          /* État succès */
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <CheckCircle2 size={48} style={{ color: '#1A5C3A', margin: '0 auto 16px' }} />
            <h2 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 24, color: '#1A1A18', margin: '0 0 10px' }}>
              Message envoyé !
            </h2>
            <p style={{ fontSize: 14, color: '#6B6B65', marginBottom: 28 }}>
              Nous vous répondrons dans les meilleurs délais.
            </p>
            <Link
              href="/"
              style={{
                display: 'inline-block', padding: '10px 28px',
                background: '#1F6B44', color: '#fff', borderRadius: 8,
                fontSize: 14, fontWeight: 600, textDecoration: 'none',
              }}
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        ) : (
          <>
            {/* En-tête */}
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 26, color: '#1A1A18', margin: '0 0 6px', fontWeight: 400 }}>
                Nous contacter
              </h1>
              <p style={{ fontSize: 14, color: '#6B6B65', margin: 0 }}>
                Une question, une démo, un partenariat — écrivez-nous.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Nom + Email côte à côte */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Nom">
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Marie Dupont"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Email">
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="marie@cabinet.fr"
                    style={inputStyle}
                  />
                </Field>
              </div>

              <Field label="Sujet" optional>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Demande de démo, question..."
                  style={inputStyle}
                />
              </Field>

              <Field label="Message">
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Décrivez votre projet ou votre question..."
                  rows={5}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </Field>

              {error && (
                <p style={{ fontSize: 13, color: '#9B1C1C', background: '#FEE8E8', padding: '10px 12px', borderRadius: 8, margin: 0 }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px 24px', borderRadius: 8, border: 'none',
                  background: loading ? '#6B9E7A' : '#1F6B44',
                  color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginTop: 4,
                }}
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {loading ? 'Envoi...' : 'Envoyer le message'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: '#6B6B65' }}>{label}</label>
        {optional && <span style={{ fontSize: 11, color: '#9B9B94', background: '#F3F3F0', borderRadius: 4, padding: '1px 6px' }}>Optionnel</span>}
      </div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1.5px solid #E8E8E3',
  borderRadius: 8,
  padding: '9px 12px',
  fontSize: 13,
  color: '#1A1A18',
  background: '#fff',
  outline: 'none',
  fontFamily: 'inherit',
}
