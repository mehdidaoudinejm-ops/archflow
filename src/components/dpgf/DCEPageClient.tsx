'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import { Upload, Trash2, FileText, AlertCircle, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'

const CATEGORIES = [
  { key: 'plans', label: 'Plans' },
  { key: 'cctp', label: 'CCTP' },
  { key: 'notices', label: 'Notices' },
  { key: 'photos', label: 'Photos' },
  { key: 'autres', label: 'Divers' },
]

interface DCEDoc {
  id: string
  name: string
  category: string
  fileUrl: string
  isMandatory: boolean
  revision: number
  createdAt: string
  readCount: number
  companiesCount: number
}

interface Props {
  projectId: string
  projectName: string
  ao: { id: string; name: string; status: string }
  initialDocs: DCEDoc[]
}

export function DCEPageClient({ projectId, projectName, ao, initialDocs }: Props) {
  const [docs, setDocs] = useState<DCEDoc[]>(initialDocs)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('plans')
  const [isMandatory, setIsMandatory] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isDraft = ao.status === 'DRAFT'

  const docsByCategory = CATEGORIES.map((cat) => ({
    ...cat,
    docs: docs.filter((d) => d.category === cat.key),
  }))

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError(null)
    setUploading(true)

    try {
      const supabase = createBrowserClient()
      const ext = file.name.split('.').pop()
      const path = `${ao.id}/${selectedCategory}/${Date.now()}.${ext}`

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('dce-documents')
        .upload(path, file, { upsert: false })

      if (uploadErr) throw new Error(uploadErr.message)

      const { data: urlData } = supabase.storage.from('dce-documents').getPublicUrl(uploadData.path)

      const res = await fetch(`/api/ao/${ao.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          category: selectedCategory,
          fileUrl: urlData.publicUrl,
          isMandatory,
        }),
      })

      const data = await res.json() as DCEDoc & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')

      setDocs((prev) => [...prev, { ...data, readCount: 0, companiesCount: docs[0]?.companiesCount ?? 0 }])
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erreur lors de l\'upload')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDelete(docId: string) {
    const res = await fetch(`/api/ao/${ao.id}/documents/${docId}`, { method: 'DELETE' })
    if (res.ok) {
      setDocs((prev) => prev.filter((d) => d.id !== docId))
    }
  }

  async function toggleMandatory(doc: DCEDoc) {
    const res = await fetch(`/api/ao/${ao.id}/documents/${doc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isMandatory: !doc.isMandatory }),
    })
    if (res.ok) {
      setDocs((prev) => prev.map((d) => d.id === doc.id ? { ...d, isMandatory: !d.isMandatory } : d))
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* En-tête */}
      <div>
        <p className="text-sm" style={{ color: 'var(--text3)' }}>{projectName}</p>
        <h1
          className="text-2xl font-semibold mt-0.5"
          style={{ fontFamily: 'var(--font-dm-serif)', color: 'var(--text)' }}
        >
          Consultation
        </h1>
      </div>

      {/* Onglets de navigation */}
      <div className="flex gap-0" style={{ borderBottom: '2px solid var(--border)' }}>
        {[
          { label: 'Consultation', href: `/dpgf/${projectId}`, active: false },
          { label: 'DCE', href: `/dpgf/${projectId}/dce`, active: true },
          { label: 'Q&A', href: `/dpgf/${projectId}/qa`, active: false },
          { label: 'Analyse', href: `/dpgf/${projectId}/analyse`, active: false },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="px-4 py-2 text-sm font-medium transition-colors"
            style={{
              color: tab.active ? 'var(--green)' : 'var(--text2)',
              borderBottom: tab.active ? '2px solid var(--green)' : '2px solid transparent',
              marginBottom: '-2px',
            }}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <p className="text-sm" style={{ color: 'var(--text2)' }}>{ao.name}</p>

      {isDraft && (
        <div
          className="px-4 py-3 rounded-[var(--radius)]"
          style={{ background: 'var(--amber-light)', border: '1px solid var(--amber)' }}
        >
          <p className="text-sm" style={{ color: 'var(--amber)' }}>
            <AlertCircle size={15} className="inline mr-1" />
            L&apos;AO est encore en brouillon. Les entreprises ne pourront consulter les documents qu&apos;après l&apos;envoi.
          </p>
        </div>
      )}

      {/* Zone d'upload */}
      <div
        className="p-5 rounded-[var(--radius-lg)]"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
          Ajouter un document
        </h2>

        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className="px-3 py-1.5 rounded-[var(--radius)] text-sm transition-colors"
                style={{
                  background: selectedCategory === cat.key ? 'var(--green-light)' : 'var(--surface2)',
                  color: selectedCategory === cat.key ? 'var(--green)' : 'var(--text2)',
                  border: `1px solid ${selectedCategory === cat.key ? 'var(--green)' : 'var(--border)'}`,
                  fontWeight: selectedCategory === cat.key ? 500 : 400,
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text2)' }}>
            <input
              type="checkbox"
              checked={isMandatory}
              onChange={(e) => setIsMandatory(e.target.checked)}
              className="w-4 h-4"
            />
            Obligatoire
          </label>
        </div>

        {uploadError && (
          <p className="text-sm mb-3 px-3 py-2 rounded-[var(--radius)]"
            style={{ background: 'var(--red-light)', color: 'var(--red)' }}>
            <AlertCircle size={14} className="inline mr-1" />{uploadError}
          </p>
        )}

        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{ background: 'var(--green-btn)', color: '#fff', border: 'none' }}
        >
          <Upload size={15} className="mr-2" />
          {uploading ? 'Upload...' : 'Choisir un fichier'}
        </Button>
        <p className="text-xs mt-2" style={{ color: 'var(--text3)' }}>
          PDF, DWG, DXF, JPG, PNG, XLSX — max 50 Mo
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png,.xlsx,.xls"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {/* Liste des documents par catégorie */}
      {docsByCategory.filter((cat) => cat.docs.length > 0 || true).map((cat) => (
        cat.docs.length === 0 ? null : (
          <div
            key={cat.key}
            className="rounded-[var(--radius-lg)] overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div
              className="px-4 py-3 border-b"
              style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}
            >
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {cat.label}
                <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text3)' }}>
                  ({cat.docs.length})
                </span>
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--text2)' }}>Nom</th>
                  <th className="text-center px-3 py-2.5 font-medium" style={{ color: 'var(--text2)' }}>Rév.</th>
                  <th className="text-center px-3 py-2.5 font-medium" style={{ color: 'var(--text2)' }}>Lectures</th>
                  <th className="text-left px-3 py-2.5 font-medium" style={{ color: 'var(--text2)' }}>Date</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {cat.docs.map((doc, i) => (
                  <tr
                    key={doc.id}
                    style={{ borderBottom: i < cat.docs.length - 1 ? '1px solid var(--border)' : undefined }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText size={15} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium hover:underline truncate max-w-xs"
                          style={{ color: 'var(--text)' }}
                        >
                          {doc.name}
                        </a>
                        {doc.isMandatory && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                            style={{ background: 'var(--amber-light)', color: 'var(--amber)' }}
                          >
                            Obligatoire
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums" style={{ color: 'var(--text2)' }}>
                      v{doc.revision}
                    </td>
                    <td className="px-3 py-3 text-center" style={{ color: 'var(--text2)' }}>
                      <span className="flex items-center justify-center gap-1">
                        <Eye size={13} />
                        {doc.readCount}/{doc.companiesCount}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs" style={{ color: 'var(--text3)' }}>
                      {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => toggleMandatory(doc)}
                          className="p-1.5 rounded hover:opacity-70 text-xs"
                          style={{ color: doc.isMandatory ? 'var(--amber)' : 'var(--text3)' }}
                          title={doc.isMandatory ? 'Retirer obligatoire' : 'Marquer obligatoire'}
                        >
                          ★
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="p-1.5 rounded hover:opacity-70"
                          style={{ color: 'var(--red)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ))}

      {docs.length === 0 && (
        <div
          className="p-12 text-center rounded-[var(--radius-lg)]"
          style={{ background: 'var(--surface)', border: '1px dashed var(--border2)' }}
        >
          <FileText size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm" style={{ color: 'var(--text3)' }}>
            Aucun document déposé. Ajoutez vos plans et pièces techniques.
          </p>
        </div>
      )}
    </div>
  )
}
