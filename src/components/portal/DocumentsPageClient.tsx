'use client'

import { useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PortalShell } from '@/components/portal/PortalShell'
import { Upload, CheckCircle2, Clock, XCircle, AlertCircle, FileText } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'

const DOC_TYPES = [
  { key: 'kbis', label: 'Extrait Kbis', description: 'Moins de 3 mois' },
  { key: 'decennale', label: 'Assurance décennale', description: 'En cours de validité' },
  { key: 'rcpro', label: 'RC Professionnelle', description: 'En cours de validité' },
  { key: 'rib', label: 'RIB', description: 'Relevé d\'identité bancaire' },
  { key: 'urssaf', label: 'Attestation URSSAF', description: 'Moins de 6 mois' },
]

type AdminDocStatus = 'PENDING' | 'VALID' | 'EXPIRED' | 'REJECTED'

interface AdminDoc {
  id: string
  type: string
  fileUrl: string
  status: AdminDocStatus
  rejectionReason: string | null
}

interface DocumentsPageClientProps {
  aoId: string
  aoName: string
  deadline: string
  companyName: string
  initialDocs: AdminDoc[]
}

function StatusBadge({ status }: { status: AdminDocStatus }) {
  const map = {
    PENDING: { label: 'En attente', bg: 'var(--amber-light)', color: 'var(--amber)', icon: <Clock size={13} /> },
    VALID: { label: 'Validé', bg: 'var(--green-light)', color: 'var(--green)', icon: <CheckCircle2 size={13} /> },
    EXPIRED: { label: 'Expiré', bg: 'var(--red-light)', color: 'var(--red)', icon: <AlertCircle size={13} /> },
    REJECTED: { label: 'Refusé', bg: 'var(--red-light)', color: 'var(--red)', icon: <XCircle size={13} /> },
  }
  const s = map[status]
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {s.icon}
      {s.label}
    </span>
  )
}

function DocumentsContent({ aoId, aoName, deadline, companyName, initialDocs }: DocumentsPageClientProps) {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [docs, setDocs] = useState<AdminDoc[]>(initialDocs)
  const [uploading, setUploading] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingDocType, setPendingDocType] = useState<string | null>(null)

  function triggerUpload(docType: string) {
    setPendingDocType(docType)
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !pendingDocType) return

    setUploadError(null)
    setUploading(pendingDocType)

    try {
      // 1. Upload vers Supabase Storage
      const supabase = createBrowserClient()
      const ext = file.name.split('.').pop()
      const path = `${aoId}/${pendingDocType}/${Date.now()}.${ext}`

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('admin-docs')
        .upload(path, file, { upsert: true })

      if (uploadErr) throw new Error(uploadErr.message)

      const { data: urlData } = supabase.storage
        .from('admin-docs')
        .getPublicUrl(uploadData.path)

      const fileUrl = urlData.publicUrl

      // 2. Enregistrer via l'API
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { 'X-Portal-Token': token } : {}),
      }

      const res = await fetch(`/api/portal/${aoId}/admin-docs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ type: pendingDocType, fileUrl }),
      })

      const data = await res.json() as AdminDoc & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')

      // 3. Mettre à jour l'état local
      setDocs((prev) => {
        const withoutOld = prev.filter((d) => d.type !== pendingDocType)
        return [...withoutOld, data]
      })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erreur lors de l\'upload')
    } finally {
      setUploading(null)
      setPendingDocType(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const docsByType = new Map(docs.map((d) => [d.type, d]))

  return (
    <PortalShell
      aoId={aoId}
      aoName={aoName}
      deadline={deadline}
      companyName={companyName}
      activeSection="documents"
      progress={0}
      saveStatus="saved"
      isSubmitted={false}
    >
      <div className="p-6 max-w-2xl">
        <h1
          className="text-xl font-semibold mb-1"
          style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--text)' }}
        >
          Documents administratifs
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text2)' }}>
          Déposez vos documents pour compléter votre dossier de candidature.
        </p>

        {uploadError && (
          <div
            className="mb-4 px-4 py-3 rounded-[var(--radius)]"
            style={{ background: 'var(--red-light)', color: 'var(--red)' }}
          >
            <p className="text-sm flex items-center gap-1">
              <AlertCircle size={15} />
              {uploadError}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {DOC_TYPES.map((docType) => {
            const existing = docsByType.get(docType.key)
            const isUploading = uploading === docType.key

            return (
              <div
                key={docType.key}
                className="flex items-center justify-between p-4 rounded-[var(--radius-lg)]"
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${existing?.status === 'VALID' ? 'var(--green)' : 'var(--border)'}`,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div className="flex items-center gap-3">
                  <FileText
                    size={20}
                    style={{ color: existing ? 'var(--green)' : 'var(--text3)', flexShrink: 0 }}
                  />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {docType.label}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text3)' }}>
                      {docType.description}
                    </p>
                    {existing?.status === 'REJECTED' && existing.rejectionReason && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--red)' }}>
                        Motif : {existing.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {existing && <StatusBadge status={existing.status} />}

                  <button
                    onClick={() => triggerUpload(docType.key)}
                    disabled={isUploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] text-sm font-medium transition-colors"
                    style={{
                      background: existing ? 'var(--surface2)' : 'var(--green-btn)',
                      color: existing ? 'var(--text)' : '#fff',
                      border: existing ? '1px solid var(--border)' : 'none',
                      cursor: isUploading ? 'not-allowed' : 'pointer',
                      opacity: isUploading ? 0.6 : 1,
                    }}
                  >
                    <Upload size={14} />
                    {isUploading ? 'Upload...' : existing ? 'Remplacer' : 'Déposer'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-xs mt-6" style={{ color: 'var(--text3)' }}>
          Formats acceptés : PDF, JPG, PNG. Taille max : 10 Mo par document.
        </p>

        {/* Input file caché */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </PortalShell>
  )
}

export function DocumentsPageClient(props: DocumentsPageClientProps) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}>
        <p style={{ color: 'var(--text2)' }}>Chargement...</p>
      </div>
    }>
      <DocumentsContent {...props} />
    </Suspense>
  )
}
