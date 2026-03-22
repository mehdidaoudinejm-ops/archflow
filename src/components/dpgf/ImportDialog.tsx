'use client'

import { useState, useRef, DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X, Loader2, FileSpreadsheet, FileText } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ImportDialogProps {
  open: boolean
  onClose: () => void
  dpgfId: string
  projectId: string
}

const ACCEPTED = '.xlsx,.xls,.csv,.pdf'
const MAX_SIZE = 20 * 1024 * 1024

export function ImportDialog({ open, onClose, dpgfId, projectId }: ImportDialogProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [importSuccess, setImportSuccess] = useState<{ imported: number; skipped: number } | null>(null)

  function handleClose() {
    if (loading) return
    setFile(null)
    setError(null)
    setImportSuccess(null)
    onClose()
  }

  function validateAndSetFile(f: File) {
    setError(null)
    if (f.size > MAX_SIZE) {
      setError('Fichier trop volumineux (max 20 Mo)')
      return
    }
    const name = f.name.toLowerCase()
    const ok =
      name.endsWith('.xlsx') ||
      name.endsWith('.xls') ||
      name.endsWith('.csv') ||
      name.endsWith('.pdf')
    if (!ok) {
      setError('Format non supporté. Utilisez xlsx, xls, csv ou pdf.')
      return
    }
    setFile(f)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) validateAndSetFile(f)
    e.target.value = ''
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(true)
  }

  function onDragLeave() { setDragging(false) }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) validateAndSetFile(f)
  }

  async function handleExcelImport() {
    if (!file || loading) return
    setLoading(true)
    setError(null)

    try {
      const form = new FormData()
      form.append('file', file)

      const res = await fetch(`/api/excel-import?dpgfId=${dpgfId}`, { method: 'POST', body: form })

      let data: { importId?: string; error?: string } = {}
      try {
        data = await res.json() as { importId?: string; error?: string }
      } catch {
        setError(`Erreur serveur (HTTP ${res.status}).`)
        setLoading(false)
        return
      }

      if (!res.ok || !data.importId) {
        setError(data.error ?? "Échec de l'import")
        setLoading(false)
        return
      }

      handleClose()
      router.push(`/dpgf/${projectId}/import?importId=${data.importId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau')
      setLoading(false)
    }
  }

  async function handlePdfImport() {
    if (!file || loading) return
    setLoading(true)
    setError(null)
    setImportSuccess(null)

    try {
      const form = new FormData()
      form.append('file', file)
      form.append('dpgfId', dpgfId)

      const res = await fetch('/api/dpgf/import-pdf', { method: 'POST', body: form })

      let data: { success?: boolean; imported?: number; skipped?: number; error?: string } = {}
      try {
        data = await res.json() as typeof data
      } catch {
        setError(`Erreur serveur (HTTP ${res.status}).`)
        setLoading(false)
        return
      }

      if (!res.ok || data.error) {
        const msg =
          data.error === 'conversion_failed' ? 'La conversion du PDF a échoué. Vérifiez que le fichier est lisible.'
          : data.error === 'parsing_failed'  ? 'Impossible de lire les données du fichier converti.'
          : data.error ?? "Échec de l'import"
        setError(msg)
        setLoading(false)
        return
      }

      setImportSuccess({ imported: data.imported ?? 0, skipped: data.skipped ?? 0 })
      setLoading(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau')
      setLoading(false)
    }
  }

  const isPDF = file?.name.toLowerCase().endsWith('.pdf')

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          maxWidth: '480px',
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--text)', fontFamily: 'var(--font-dm-serif)' }}>
            Importer votre fichier
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm" style={{ color: 'var(--text2)' }}>
          Glissez un fichier Excel (xlsx, xls, csv) ou PDF pour l&apos;importer dans votre DPGF.
        </p>

        {/* Zone drop */}
        <div
          onClick={() => !loading && inputRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] py-10 cursor-pointer transition-colors"
          style={{
            border: `2px dashed ${dragging ? 'var(--green)' : 'var(--border2)'}`,
            background: dragging ? 'var(--green-light)' : 'var(--surface2)',
          }}
        >
          {file ? (
            <>
              {isPDF ? (
                <FileText size={32} style={{ color: 'var(--green)' }} />
              ) : (
                <FileSpreadsheet size={32} style={{ color: 'var(--green)' }} />
              )}
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {file.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                  {(file.size / 1024).toFixed(0)} Ko
                </p>
              </div>
              {!loading && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                    setError(null)
                  }}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                  style={{ color: 'var(--text3)', background: 'var(--border)' }}
                >
                  <X size={12} /> Changer de fichier
                </button>
              )}
            </>
          ) : (
            <>
              <Upload size={28} style={{ color: 'var(--text3)' }} />
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: 'var(--text2)' }}>
                  Glissez un fichier ici
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                  ou cliquez pour sélectionner
                </p>
              </div>
              <p className="text-xs" style={{ color: 'var(--text3)' }}>
                xlsx, xls, csv, pdf · max 20 Mo
              </p>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          onChange={onFileChange}
          className="hidden"
        />

        {error && (
          <p className="text-sm" style={{ color: 'var(--red)' }}>
            {error}
          </p>
        )}

        {importSuccess && (
          <p className="text-sm font-medium" style={{ color: 'var(--green)' }}>
            {importSuccess.imported} ligne{importSuccess.imported > 1 ? 's' : ''} importée{importSuccess.imported > 1 ? 's' : ''}
            {importSuccess.skipped > 0 && ` (${importSuccess.skipped} ignorée${importSuccess.skipped > 1 ? 's' : ''})`}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-[var(--radius)] border"
            style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--surface)' }}
          >
            {importSuccess ? 'Fermer' : 'Annuler'}
          </button>

          {!importSuccess && file && (
            <button
              onClick={isPDF ? handlePdfImport : handleExcelImport}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-[var(--radius)] font-medium"
              style={{
                background: loading ? 'var(--surface2)' : 'var(--green-btn)',
                color: loading ? 'var(--text3)' : '#fff',
                border: 'none',
              }}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? 'Import en cours…' : 'Importer'}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
