'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const PROJECT_TYPES = [
  'Logement individuel',
  'Logement collectif',
  'Bureau',
  'Commerce',
  'Rénovation',
  'Extension',
  'Autre',
]

// ─── Shared field components ──────────────────────────────────────────────────

function FieldLabel({ children, optional }: { children: string; optional?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: '#4B4B45' }}>{children}</label>
      {optional && (
        <span style={{ fontSize: 11, color: '#9B9B94', background: '#F3F3F0', borderRadius: 6, padding: '1px 7px', fontWeight: 400 }}>
          Optionnel
        </span>
      )}
    </div>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
  required,
  autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  autoFocus?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      autoFocus={autoFocus}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        border: focused ? '1.5px solid #1A5C3A' : '1.5px solid #E0E0DA',
        borderRadius: 12,
        padding: '10px 14px',
        fontSize: 14,
        color: '#1A1A18',
        background: '#fff',
        outline: 'none',
        boxShadow: focused ? '0 0 0 3px rgba(26,92,58,0.08)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    />
  )
}

function NumberInput({
  value,
  onChange,
  placeholder,
  min,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  min?: number
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        border: focused ? '1.5px solid #1A5C3A' : '1.5px solid #E0E0DA',
        borderRadius: 12,
        padding: '10px 14px',
        fontSize: 14,
        color: '#1A1A18',
        background: '#fff',
        outline: 'none',
        boxShadow: focused ? '0 0 0 3px rgba(26,92,58,0.08)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    />
  )
}

function SelectInput({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        border: focused ? '1.5px solid #1A5C3A' : '1.5px solid #E0E0DA',
        borderRadius: 12,
        padding: '10px 14px',
        fontSize: 14,
        color: value ? '#1A1A18' : '#9B9B94',
        background: '#fff',
        outline: 'none',
        boxShadow: focused ? '0 0 0 3px rgba(26,92,58,0.08)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        appearance: 'none',
        cursor: 'pointer',
      }}
    >
      <option value="">{placeholder ?? 'Choisir...'}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

function DateInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        border: focused ? '1.5px solid #1A5C3A' : '1.5px solid #E0E0DA',
        borderRadius: 12,
        padding: '10px 14px',
        fontSize: 14,
        color: '#1A1A18',
        background: '#fff',
        outline: 'none',
        boxShadow: focused ? '0 0 0 3px rgba(26,92,58,0.08)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    />
  )
}

function TextareaInput({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  const [focused, setFocused] = useState(false)
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        border: focused ? '1.5px solid #1A5C3A' : '1.5px solid #E0E0DA',
        borderRadius: 12,
        padding: '10px 14px',
        fontSize: 14,
        color: '#1A1A18',
        background: '#fff',
        outline: 'none',
        boxShadow: focused ? '0 0 0 3px rgba(26,92,58,0.08)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        resize: 'vertical',
        fontFamily: 'inherit',
      }}
    />
  )
}

function SectionTitle({ children }: { children: string }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 600, color: '#9B9B94', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 18 }}>
      {children}
    </p>
  )
}

function Divider() {
  return <div style={{ height: 1, background: '#F0F0EB', margin: '24px 0' }} />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewProjectPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [projectType, setProjectType] = useState('')
  const [surface, setSurface] = useState('')
  const [budget, setBudget] = useState('')
  const [startDate, setStartDate] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const body: Record<string, unknown> = { name }
      if (address.trim()) body.address = address.trim()
      if (projectType) body.projectType = projectType
      if (surface) body.surface = parseFloat(surface)
      if (budget) body.budget = parseFloat(budget)
      if (startDate) body.startDate = startDate
      if (description.trim()) body.description = description.trim()

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json() as { id?: string; error?: string }

      if (!res.ok) {
        setError(data.error ?? 'Erreur lors de la création du projet')
        return
      }

      router.push(`/dpgf/${data.id!}`)
      router.refresh()
    } catch {
      setError('Une erreur est survenue. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>

      {/* Back link */}
      <Link
        href="/dashboard"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#9B9B94', textDecoration: 'none', marginBottom: 24 }}
      >
        <ArrowLeft size={14} />
        Retour aux projets
      </Link>

      <h1 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 28, color: '#1A1A18', marginBottom: 24 }}>
        Nouveau projet
      </h1>

      {/* Card */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8E8E3', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', padding: '32px 36px' }}>
        <form onSubmit={handleSubmit}>

          {/* ── Section 1 — Informations générales ── */}
          <SectionTitle>Informations générales</SectionTitle>

          <div style={{ marginBottom: 16 }}>
            <FieldLabel>Nom du projet</FieldLabel>
            <TextInput
              value={name}
              onChange={setName}
              placeholder="ex. Villa Martignon — Paris 16e"
              required
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <FieldLabel optional>Type de projet</FieldLabel>
            <SelectInput
              value={projectType}
              onChange={setProjectType}
              options={PROJECT_TYPES}
              placeholder="Sélectionner un type..."
            />
          </div>

          <div>
            <FieldLabel optional>Adresse du chantier</FieldLabel>
            <TextInput
              value={address}
              onChange={setAddress}
              placeholder="ex. 12 avenue Foch, 75016 Paris"
            />
          </div>

          <Divider />

          {/* ── Section 2 — Détails du projet ── */}
          <SectionTitle>Détails du projet</SectionTitle>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <FieldLabel optional>Surface estimée (m²)</FieldLabel>
              <NumberInput
                value={surface}
                onChange={setSurface}
                placeholder="ex. 120"
                min={0}
              />
            </div>
            <div>
              <FieldLabel optional>Budget estimatif (€)</FieldLabel>
              <NumberInput
                value={budget}
                onChange={setBudget}
                placeholder="ex. 150000"
                min={0}
              />
              <p style={{ fontSize: 11, color: '#9B9B94', marginTop: 5 }}>
                Visible uniquement par l&apos;architecte
              </p>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <FieldLabel optional>Date de début souhaitée</FieldLabel>
            <DateInput value={startDate} onChange={setStartDate} />
          </div>

          <div>
            <FieldLabel optional>Description courte</FieldLabel>
            <TextareaInput
              value={description}
              onChange={setDescription}
              placeholder="Contexte du projet, contraintes particulières, objectifs..."
              rows={3}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: '#FEE8E8', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginTop: 20 }}>
              <p style={{ color: '#9B1C1C', fontSize: 13, margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              style={{
                flex: 1,
                padding: '11px 20px',
                borderRadius: 12,
                border: '1.5px solid #E0E0DA',
                background: 'transparent',
                color: '#6B6B65',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'border-color 0.15s, color 0.15s',
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              style={{
                flex: 2,
                padding: '11px 20px',
                borderRadius: 12,
                border: 'none',
                background: loading || !name.trim() ? '#6B9E7A' : '#1F6B44',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: loading || !name.trim() ? 'not-allowed' : 'pointer',
                boxShadow: loading || !name.trim() ? 'none' : '0 2px 8px rgba(26,92,58,0.25)',
                transition: 'background 0.2s, box-shadow 0.2s',
              }}
            >
              {loading ? 'Création...' : 'Créer le projet →'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
