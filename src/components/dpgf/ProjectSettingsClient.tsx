'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Check, ChevronDown, Mail, Send } from 'lucide-react'

const PROJECT_TYPES = [
  'Logement individuel', 'Logement collectif', 'Bureau',
  'Commerce', 'Rénovation', 'Extension', 'Autre',
]

interface ContactOption {
  id: string
  firstName: string
  lastName: string | null
  email: string | null
  phone: string | null
}

interface ProjectData {
  id: string
  name: string
  address: string | null
  projectType: string | null
  surface: number | null
  budget: number | null
  startDate: string | null
  description: string | null
  clientContact: ContactOption | null
  clientUserId: string | null
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)' }}>{label}</label>
        {optional && <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface2)', borderRadius: 6, padding: '1px 7px' }}>Optionnel</span>}
      </div>
      {children}
    </div>
  )
}

const inputStyle = (focused: boolean): React.CSSProperties => ({
  width: '100%', boxSizing: 'border-box',
  border: focused ? '1.5px solid var(--green)' : '1.5px solid var(--border2)',
  borderRadius: 10, padding: '9px 12px',
  fontSize: 13, color: 'var(--text)', background: 'var(--surface)', outline: 'none',
  boxShadow: focused ? '0 0 0 3px rgba(26,92,58,0.08)' : 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  fontFamily: 'inherit',
})

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [focused, setFocused] = useState(false)
  return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={inputStyle(focused)} />
}

function NumberInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [focused, setFocused] = useState(false)
  return <input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} min={0} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={inputStyle(focused)} />
}

function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [focused, setFocused] = useState(false)
  return <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={{ ...inputStyle(focused), resize: 'vertical' }} />
}

function Select({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={{ ...inputStyle(focused), appearance: 'none', paddingRight: 32, cursor: 'pointer' }}>
        <option value="">{placeholder ?? '—'}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '24px 0' }} />
}

function SectionTitle({ children }: { children: string }) {
  return <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 18 }}>{children}</p>
}

export function ProjectSettingsClient({ project, contacts }: { project: ProjectData; contacts: ContactOption[] }) {
  const params = useParams<{ projectId: string }>()
  const router = useRouter()
  const projectId = params.projectId

  // Project fields
  const [name, setName] = useState(project.name)
  const [address, setAddress] = useState(project.address ?? '')
  const [projectType, setProjectType] = useState(project.projectType ?? '')
  const [surface, setSurface] = useState(project.surface?.toString() ?? '')
  const [budget, setBudget] = useState(project.budget?.toString() ?? '')
  const [startDate, setStartDate] = useState(project.startDate ?? '')
  const [description, setDescription] = useState(project.description ?? '')

  // Client fields
  const [clientFirstName, setClientFirstName] = useState(project.clientContact?.firstName ?? '')
  const [clientLastName, setClientLastName] = useState(project.clientContact?.lastName ?? '')
  const [clientEmail, setClientEmail] = useState(project.clientContact?.email ?? '')
  const [clientPhone, setClientPhone] = useState(project.clientContact?.phone ?? '')

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Invitation client
  const [clientInvited, setClientInvited] = useState(!!project.clientUserId)
  const [inviting, setInviting] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  async function handleInviteClient() {
    setInviting(true)
    setInviteError(null)
    setInviteSuccess(false)
    try {
      const res = await fetch(`/api/projects/${projectId}/invite-client`, { method: 'POST' })
      const data = await res.json() as { error?: string }
      if (!res.ok) {
        setInviteError(data.error ?? 'Erreur lors de l\'invitation')
      } else {
        setClientInvited(true)
        setInviteSuccess(true)
        setTimeout(() => setInviteSuccess(false), 4000)
      }
    } catch {
      setInviteError('Erreur réseau')
    } finally {
      setInviting(false)
    }
  }

  // Annuaire picker
  const [showPicker, setShowPicker] = useState(false)

  const tabs = [
    { label: 'Infos', href: `/dpgf/${projectId}/settings` },
    { label: 'DQE', href: `/dpgf/${projectId}` },
    { label: 'DCE', href: `/dpgf/${projectId}/dce` },
    { label: 'Q&A', href: `/dpgf/${projectId}/qa` },
    { label: 'Analyse', href: `/dpgf/${projectId}/analyse` },
  ]

  function pickContact(c: ContactOption) {
    setClientFirstName(c.firstName)
    setClientLastName(c.lastName ?? '')
    setClientEmail(c.email ?? '')
    setClientPhone(c.phone ?? '')
    setShowPicker(false)
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim() || null,
          projectType: projectType || null,
          surface: surface ? parseFloat(surface) : null,
          budget: budget ? parseFloat(budget) : null,
          startDate: startDate || null,
          description: description.trim() || null,
          clientFirstName: clientFirstName.trim() || null,
          clientLastName: clientLastName.trim() || null,
          clientEmail: clientEmail.trim() || null,
          clientPhone: clientPhone.trim() || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        setError(d.error ?? 'Erreur')
      } else {
        setSaved(true)
        router.refresh()
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      setError('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4" style={{ padding: '20px 24px 0' }}>
        <h1 style={{ fontFamily: 'var(--font-dm-serif)', fontSize: 22, color: 'var(--text)', margin: 0 }}>
          {project.name}
        </h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)', padding: '0 24px' }}>
        {tabs.map((tab) => {
          const active = tab.label === 'Infos'
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 500,
                color: active ? 'var(--green)' : 'var(--text2)',
                borderBottom: active ? '2px solid var(--green)' : '2px solid transparent',
                marginBottom: -2,
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>

        {/* Section 1 — Projet */}
        <SectionTitle>Informations du projet</SectionTitle>

        <div style={{ display: 'grid', gap: 16 }}>
          <Field label="Nom du projet">
            <TextInput value={name} onChange={setName} placeholder="ex. Villa Martignon — Paris 16e" />
          </Field>

          <Field label="Type de projet" optional>
            <Select value={projectType} onChange={setProjectType} options={PROJECT_TYPES} placeholder="Sélectionner..." />
          </Field>

          <Field label="Adresse du chantier" optional>
            <TextInput value={address} onChange={setAddress} placeholder="ex. 12 avenue Foch, 75016 Paris" />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Surface (m²)" optional>
              <NumberInput value={surface} onChange={setSurface} placeholder="120" />
            </Field>
            <Field label="Budget estimatif (€)" optional>
              <NumberInput value={budget} onChange={setBudget} placeholder="150 000" />
            </Field>
          </div>

          <Field label="Date de début" optional>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ ...inputStyle(false), cursor: 'pointer' }}
            />
          </Field>

          <Field label="Description" optional>
            <Textarea value={description} onChange={setDescription} placeholder="Contexte, contraintes, objectifs..." />
          </Field>
        </div>

        <Divider />

        {/* Section 2 — Client */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <SectionTitle>Client du projet</SectionTitle>
          {contacts.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowPicker((v) => !v)}
                style={{ fontSize: 12, color: 'var(--green)', background: 'var(--green-light)', border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontWeight: 500 }}
              >
                Choisir depuis l&apos;annuaire
              </button>
              {showPicker && (
                <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: '#fff', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, minWidth: 260, maxHeight: 240, overflowY: 'auto' }}>
                  {contacts.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => pickContact(c)}
                      style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{c.firstName} {c.lastName}</span>
                      {c.email && <span style={{ fontSize: 12, color: 'var(--text3)' }}>{c.email}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Prénom" optional>
              <TextInput value={clientFirstName} onChange={setClientFirstName} placeholder="Marie" />
            </Field>
            <Field label="Nom" optional>
              <TextInput value={clientLastName} onChange={setClientLastName} placeholder="Dupont" />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Email" optional>
              <TextInput value={clientEmail} onChange={setClientEmail} placeholder="marie@exemple.fr" />
            </Field>
            <Field label="Téléphone" optional>
              <TextInput value={clientPhone} onChange={setClientPhone} placeholder="06 12 34 56 78" />
            </Field>
          </div>
        </div>

        {/* Invitation client */}
        <div style={{ marginTop: 24, padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border)', background: clientInvited ? 'var(--green-light)' : 'var(--surface2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: clientInvited ? 'var(--green)' : 'var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {clientInvited ? <Check size={15} color="#fff" /> : <Mail size={15} color="var(--text3)" />}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {clientInvited ? 'Espace client activé' : 'Inviter le client'}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text2)' }}>
                  {clientInvited
                    ? `Un lien d'accès a été envoyé à ${clientEmail || project.clientContact?.email}`
                    : clientEmail
                      ? `Envoyer un lien d'accès à ${clientEmail}`
                      : 'Renseignez l\'email client pour activer'}
                </p>
              </div>
            </div>
            <button
              onClick={handleInviteClient}
              disabled={inviting || !clientEmail || !!inviteSuccess}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: !clientEmail ? 'var(--border)' : clientInvited ? 'rgba(26,92,58,0.15)' : 'var(--green-btn)',
                color: !clientEmail ? 'var(--text3)' : clientInvited ? 'var(--green)' : '#fff',
                fontSize: 13, fontWeight: 600,
                cursor: !clientEmail || inviting || !!inviteSuccess ? 'not-allowed' : 'pointer',
                opacity: inviting ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              <Send size={13} />
              {inviting ? 'Envoi...' : inviteSuccess ? 'Envoyé ✓' : clientInvited ? 'Renvoyer' : 'Envoyer l\'invitation'}
            </button>
          </div>
          {inviteError && (
            <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--red)' }}>{inviteError}</p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'var(--red-light)', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginTop: 20 }}>
            <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 28 }}>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            style={{
              padding: '10px 28px', borderRadius: 10, border: 'none',
              background: saving || !name.trim() ? '#6B9E7A' : 'var(--green-btn)',
              color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: saving || !name.trim() ? 'not-allowed' : 'pointer',
              boxShadow: saving ? 'none' : '0 2px 8px rgba(26,92,58,0.2)',
            }}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          {saved && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>
              <Check size={15} />
              Enregistré
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
