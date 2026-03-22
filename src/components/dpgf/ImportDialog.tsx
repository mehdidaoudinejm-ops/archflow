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
  const [loadingMode, setLoadingMode] = useState<'ai' | 'direct' | 'pdf' | null>(null)
  const [importSuccess, setImportSuccess] = useState<{ imported: number; skipped: number } | null>(null)
  const loading = loadingMode !== null

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

  function onDragLeave() {
    setDragging(false)
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) validateAndSetFile(f)
  }

  async function handleImport(mode: 'ai' | 'direct') {
    if (!file || loading) return
    setLoadingMode(mode)
    setError(null)

    try {
      const form = new FormData()
      form.append('file', file)

      // [LEGACY - import IA] const endpoint = mode === 'direct' ? `/api/excel-import?dpgfId=${dpgfId}` : `/api/ai-import?dpgfId=${dpgfId}`
      const endpoint = mode === 'direct'
        ? `/api/excel-import?dpgfId=${dpgfId}`
        : `/api/ai-import?dpgfId=${dpgfId}` // [LEGACY - import IA] — Excel uniquement désormais

      const res = await fetch(endpoint, { method: 'POST', body: form })

      let data: { importId?: string; error?: string } = {}
      try {
        data = await res.json() as { importId?: string; error?: string }
      } catch {
        setError(
          mode === 'ai'
            ? `Erreur serveur (HTTP ${res.status}). Vérifiez que ANTHROPIC_API_KEY est définie en production.`
            : `Erreur serveur (HTTP ${res.status}).`
        )
        setLoadingMode(null)
        return
      }

      if (!res.ok || !data.importId) {
        setError(data.error ?? (mode === 'ai' ? "Échec de l'analyse IA" : "Échec de l'import"))
        setLoadingMode(null)
        return
      }

      handleClose()
      router.push(`/dpgf/${projectId}/import?importId=${data.importId}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau'
      setError(msg)
      setLoadingMode(null)
    }
  }

  // Nouveau flow PDF : conversion via iLovePDF (sans IA)
  async function handlePdfImport() {
    if (!file || loading) return
    setLoadingMode('pdf')
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
        setLoadingMode(null)
        return
      }

      if (!res.ok || data.error) {
        const msg =
          data.error === 'conversion_failed' ? 'La conversion du PDF a échoué. Vérifiez que le fichier est lisible.'
          : data.error === 'parsing_failed'  ? 'Impossible de lire les données du fichier converti.'
          : data.error ?? "Échec de l'import"
        setError(msg)
        setLoadingMode(null)
        return
      }

      setImportSuccess({ imported: data.imported ?? 0, skipped: data.skipped ?? 0 })
      setLoadingMode(null)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau'
      setError(msg)
      setLoadingMode(null)
    }
  }

  const isPDF = file?.name.toLowerCase().endsWith('.pdf')
  const isExcel = file ? !isPDF : false

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
          Importez un fichier Excel (xlsx, xls, csv) ou PDF. Pour Excel, vous pouvez importer
          directement ou utiliser l&apos;IA. Pour PDF, la conversion se fait via iLovePDF.
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
            Annuler
          </button>

          {/* Import direct — Excel uniquement */}
          {isExcel && (
            <button
              onClick={() => handleImport('direct')}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-[var(--radius)] font-medium"
              style={{
                background: loading ? 'var(--surface2)' : 'var(--surface)',
                color: loading ? 'var(--text3)' : 'var(--green)',
                border: `1.5px solid ${loading ? 'var(--border)' : 'var(--green)'}`,
              }}
            >
              {loadingMode === 'direct' && <Loader2 size={14} className="animate-spin" />}
              {loadingMode === 'direct' ? 'Import en cours…' : 'Import direct'}
            </button>
          )}

          {/* Analyse IA — Excel uniquement */}
          {isExcel && (
            <button
              onClick={() => handleImport('ai')}
              disabled={!file || loading}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-[var(--radius)] font-medium"
              style={{
                background: !file || loading ? 'var(--surface2)' : 'var(--green-btn)',
                color: !file || loading ? 'var(--text3)' : '#fff',
                border: 'none',
              }}
            >
              {loadingMode === 'ai' && <Loader2 size={14} className="animate-spin" />}
              {loadingMode === 'ai' ? 'Analyse IA en cours…' : "Analyser avec l'IA"}
            </button>
          )}

          {/* [LEGACY - import IA] Ancien bouton PDF → Claude :
          {isPDF && (
            <button onClick={() => handleImport('ai')} ...>
              Analyser
            </button>
          )} */}

          {/* Nouveau flow PDF → iLovePDF (sans IA) */}
          {isPDF && !importSuccess && (
            <button
              onClick={handlePdfImport}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-[var(--radius)] font-medium"
              style={{
                background: loading ? 'var(--surface2)' : 'var(--green-btn)',
                color: loading ? 'var(--text3)' : '#fff',
                border: 'none',
              }}
            >
              {loadingMode === 'pdf' && <Loader2 size={14} className="animate-spin" />}
              {loadingMode === 'pdf' ? 'Conversion en cours…' : 'Importer'}
            </button>
          )}

          {importSuccess && (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm rounded-[var(--radius)] font-medium"
              style={{ background: 'var(--green-btn)', color: '#fff', border: 'none' }}
            >
              Fermer
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
