'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Pencil, Trash2, X, Check } from 'lucide-react'

type ContactType = 'CLIENT' | 'ENTREPRISE'

interface Contact {
  id: string
  type: ContactType
  firstName: string
  lastName: string | null
  email: string | null
  phone: string | null
  company: string | null
  address: string | null
  notes: string | null
  createdAt: string
}

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

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        border: focused ? '1.5px solid #1A5C3A' : '1.5px solid #E0E0DA',
        borderRadius: 10,
        padding: '9px 12px',
        fontSize: 13,
        color: '#1A1A18',
        background: '#fff',
        outline: 'none',
        boxShadow: focused ? '0 0 0 3px rgba(26,92,58,0.08)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    />
  )
}

function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [focused, setFocused] = useState(false)
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        border: focused ? '1.5px solid #1A5C3A' : '1.5px solid #E0E0DA',
        borderRadius: 10,
        padding: '9px 12px',
        fontSize: 13,
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

// ─── Contact form state ───────────────────────────────────────────────────────

interface FormState {
  firstName: string
  lastName: string
  email: string
  phone: string
  company: string
  address: string
  notes: string
}

const emptyForm = (): FormState => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  company: '',
  address: '',
  notes: '',
})

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  onSubmit,
  loading,
  type,
  form,
  setForm,
}: {
  title: string
  onClose: () => void
  onSubmit: () => void
  loading: boolean
  type: ContactType
  form: FormState
  setForm: (f: FormState) => void
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 520,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 20, color: '#1A1A18', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B9B94', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <FieldLabel>Prénom</FieldLabel>
            <Input value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} placeholder="Marie" />
          </div>
          <div>
            <FieldLabel optional>Nom</FieldLabel>
            <Input value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} placeholder="Dupont" />
          </div>
        </div>

        {type === 'ENTREPRISE' && (
          <div style={{ marginBottom: 14 }}>
            <FieldLabel optional>Entreprise</FieldLabel>
            <Input value={form.company} onChange={(v) => setForm({ ...form, company: v })} placeholder="SARL Bâtisseur" />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <FieldLabel optional>Email</FieldLabel>
            <Input value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="marie@exemple.fr" type="email" />
          </div>
          <div>
            <FieldLabel optional>Téléphone</FieldLabel>
            <Input value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="06 12 34 56 78" />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <FieldLabel optional>Adresse</FieldLabel>
          <Input value={form.address} onChange={(v) => setForm({ ...form, address: v })} placeholder="12 rue de la Paix, 75001 Paris" />
        </div>

        <div style={{ marginBottom: 24 }}>
          <FieldLabel optional>Notes</FieldLabel>
          <Textarea value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="Informations complémentaires..." />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 10,
              border: '1.5px solid #E0E0DA', background: 'transparent',
              color: '#6B6B65', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={onSubmit}
            disabled={loading || !form.firstName.trim()}
            style={{
              flex: 2, padding: '10px 16px', borderRadius: 10, border: 'none',
              background: loading || !form.firstName.trim() ? '#6B9E7A' : '#1F6B44',
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: loading || !form.firstName.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnnuairePage() {
  const [tab, setTab] = useState<ContactType>('CLIENT')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/contacts?type=${tab}`)
    if (res.ok) {
      const data = await res.json() as Contact[]
      setContacts(data)
    }
    setLoading(false)
  }, [tab])

  useEffect(() => { void fetchContacts() }, [fetchContacts])

  function openCreate() {
    setForm(emptyForm())
    setShowCreate(true)
  }

  function openEdit(c: Contact) {
    setForm({
      firstName: c.firstName,
      lastName: c.lastName ?? '',
      email: c.email ?? '',
      phone: c.phone ?? '',
      company: c.company ?? '',
      address: c.address ?? '',
      notes: c.notes ?? '',
    })
    setEditContact(c)
  }

  async function handleCreate() {
    setSaving(true)
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: tab, ...form }),
    })
    if (res.ok) {
      setShowCreate(false)
      await fetchContacts()
    }
    setSaving(false)
  }

  async function handleEdit() {
    if (!editContact) return
    setSaving(true)
    const res = await fetch(`/api/contacts/${editContact.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setEditContact(null)
      await fetchContacts()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setDeleteId(null)
      await fetchContacts()
    }
  }

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.firstName.toLowerCase().includes(q) ||
      (c.lastName ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.company ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 28, color: '#1A1A18', margin: 0 }}>Annuaire</h1>
          <p style={{ fontSize: 13, color: '#9B9B94', marginTop: 4 }}>Gérez vos contacts clients et entreprises</p>
        </div>
        <button
          onClick={openCreate}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 18px', borderRadius: 10, border: 'none',
            background: '#1F6B44', color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(26,92,58,0.25)',
          }}
        >
          <Plus size={15} />
          Nouveau contact
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#F3F3F0', borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content' }}>
        {(['CLIENT', 'ENTREPRISE'] as ContactType[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearch('') }}
            style={{
              padding: '7px 18px', borderRadius: 7, border: 'none',
              background: tab === t ? '#fff' : 'transparent',
              color: tab === t ? '#1A1A18' : '#9B9B94',
              fontSize: 13, fontWeight: tab === t ? 600 : 400,
              cursor: 'pointer',
              boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {t === 'CLIENT' ? 'Clients' : 'Entreprises'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9B9B94' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tab === 'CLIENT' ? 'Rechercher un client...' : 'Rechercher une entreprise...'}
          style={{
            width: '100%', boxSizing: 'border-box',
            border: '1.5px solid #E0E0DA', borderRadius: 10,
            padding: '9px 12px 9px 36px',
            fontSize: 13, color: '#1A1A18', background: '#fff', outline: 'none',
          }}
        />
      </div>

      {/* List */}
      {loading ? (
        <p style={{ color: '#9B9B94', fontSize: 14 }}>Chargement...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: '#9B9B94', fontSize: 14 }}>
            {search ? 'Aucun résultat pour cette recherche.' : tab === 'CLIENT' ? 'Aucun client pour l\'instant.' : 'Aucune entreprise pour l\'instant.'}
          </p>
          {!search && (
            <button
              onClick={openCreate}
              style={{ marginTop: 12, fontSize: 13, color: '#1A5C3A', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
            >
              + Ajouter un {tab === 'CLIENT' ? 'client' : 'contact entreprise'}
            </button>
          )}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E8E8E3', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          {filtered.map((c, i) => (
            <div
              key={c.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '14px 20px',
                borderBottom: i < filtered.length - 1 ? '1px solid #F0F0EB' : 'none',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 38, height: 38, borderRadius: '50%', background: '#EAF3ED',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 600, color: '#1A5C3A', flexShrink: 0,
              }}>
                {c.firstName[0]}{c.lastName?.[0] ?? ''}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#1A1A18', margin: 0 }}>
                  {c.firstName} {c.lastName}
                  {c.company && <span style={{ fontSize: 12, color: '#9B9B94', fontWeight: 400, marginLeft: 8 }}>· {c.company}</span>}
                </p>
                <div style={{ display: 'flex', gap: 14, marginTop: 2 }}>
                  {c.email && <span style={{ fontSize: 12, color: '#6B6B65' }}>{c.email}</span>}
                  {c.phone && <span style={{ fontSize: 12, color: '#6B6B65' }}>{c.phone}</span>}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6 }}>
                {deleteId === c.id ? (
                  <>
                    <button
                      onClick={() => void handleDelete(c.id)}
                      style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: '#FEE8E8', color: '#9B1C1C', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Check size={13} /> Confirmer
                    </button>
                    <button
                      onClick={() => setDeleteId(null)}
                      style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #E0E0DA', background: 'transparent', color: '#6B6B65', fontSize: 12, cursor: 'pointer' }}
                    >
                      <X size={13} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => openEdit(c)}
                      style={{ padding: '6px 8px', borderRadius: 7, border: '1px solid #E0E0DA', background: 'transparent', color: '#6B6B65', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteId(c.id)}
                      style={{ padding: '6px 8px', borderRadius: 7, border: '1px solid #E0E0DA', background: 'transparent', color: '#9B9B94', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <Modal
          title={`Nouveau ${tab === 'CLIENT' ? 'client' : 'contact entreprise'}`}
          onClose={() => setShowCreate(false)}
          onSubmit={() => void handleCreate()}
          loading={saving}
          type={tab}
          form={form}
          setForm={setForm}
        />
      )}

      {/* Edit modal */}
      {editContact && (
        <Modal
          title="Modifier le contact"
          onClose={() => setEditContact(null)}
          onSubmit={() => void handleEdit()}
          loading={saving}
          type={editContact.type}
          form={form}
          setForm={setForm}
        />
      )}
    </div>
  )
}
