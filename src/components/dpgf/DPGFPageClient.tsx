'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { useDPGF } from '@/hooks/useDPGF'
import { StatsBar } from './StatsBar'
import { DPGFToolbar } from './DPGFToolbar'
import { DPGFTable } from './DPGFTable'
import { LibrarySheet } from './LibrarySheet'
import { ImportDialog } from './ImportDialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface DPGFPageClientProps {
  dpgfId: string
  projectId: string
  projectName: string
  initialAo: { id: string; status: string } | null
}

export function DPGFPageClient({ dpgfId, projectId, projectName, initialAo }: DPGFPageClientProps) {
  const router = useRouter()
  const dpgfState = useDPGF(dpgfId)
  const [search, setSearch]             = useState('')
  const [libraryOpen, setLibraryOpen]   = useState(false)
  const [libraryCount, setLibraryCount] = useState<number | undefined>(undefined)
  const [importOpen, setImportOpen]     = useState(false)
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const [unlocking, setUnlocking]       = useState(false)

  // Statut courant (se met à jour après refresh)
  const dpgfStatus = dpgfState.dpgf?.status ?? 'DRAFT'
  const isLocked   = dpgfStatus === 'AO_SENT'

  // Variant du bouton AO
  const aoButtonVariant: 'draft' | 'active' | 'closed' =
    dpgfStatus === 'AO_SENT' ? 'active' :
    dpgfStatus === 'CLOSED'  ? 'closed' :
    'draft'

  function handleLaunchAO() {
    if (dpgfStatus === 'AO_SENT' && initialAo) {
      router.push(`/dpgf/${projectId}/ao/${initialAo.id}`)
    } else if (dpgfStatus === 'CLOSED' && initialAo) {
      router.push(`/dpgf/${projectId}/analyse`)
    } else {
      router.push(`/dpgf/${projectId}/ao`)
    }
  }

  // Fetch library count (no filter → total)
  const refreshLibraryCount = useCallback(async () => {
    try {
      const res = await fetch('/api/library')
      if (res.ok) {
        const data = await res.json() as unknown[]
        setLibraryCount(Array.isArray(data) ? data.length : 0)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    refreshLibraryCount()
  }, [refreshLibraryCount])

  async function saveToLibrary(
    lotId: string,
    postId: string,
    data: { trade?: string | null }
  ) {
    await fetch(`/api/dpgf/${dpgfId}/lots/${lotId}/posts/${postId}/save-to-library`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    await refreshLibraryCount()
  }

  async function handleUnlock() {
    setUnlocking(true)
    try {
      const res = await fetch(`/api/dpgf/${dpgfId}/unlock`, { method: 'POST' })
      if (res.ok) {
        setShowUnlockModal(false)
        await dpgfState.refresh()
      }
    } finally {
      setUnlocking(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm" style={{ color: 'var(--text3)' }}>
            {projectName}
          </p>
          <h1
            className="text-2xl font-semibold mt-0.5"
            style={{ fontFamily: 'var(--font-dm-serif)', color: 'var(--text)' }}
          >
            DQE
          </h1>
        </div>
      </div>

      {/* Onglets de navigation */}
      <div className="flex gap-0" style={{ borderBottom: '2px solid var(--border)' }}>
        {[
          { label: "DQE", href: `/dpgf/${projectId}`, active: true },
          { label: 'DCE', href: `/dpgf/${projectId}/dce`, active: false },
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

      {/* Bandeau verrouillé */}
      {isLocked && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-[var(--radius)]"
          style={{ background: 'var(--amber-light)', border: '1px solid var(--amber)' }}
        >
          <span className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--amber)' }}>
            <AlertCircle size={15} />
            DPGF verrouillé — Appel d&apos;offre en cours
          </span>
          <button
            onClick={() => setShowUnlockModal(true)}
            className="text-sm font-medium px-3 py-1.5 rounded-[var(--radius)]"
            style={{ background: 'var(--amber)', color: '#fff' }}
          >
            Modifier le DPGF
          </button>
        </div>
      )}

      {/* Stats */}
      <StatsBar dpgf={dpgfState.dpgf} libraryCount={libraryCount} />

      {/* Toolbar */}
      <DPGFToolbar
        search={search}
        onSearchChange={setSearch}
        onImport={() => setImportOpen(true)}
        onExportPdf={() => {}}
        onLaunchAO={handleLaunchAO}
        onOpenLibrary={() => setLibraryOpen(true)}
        aoButtonVariant={aoButtonVariant}
      />

      {/* Tableau */}
      <DPGFTable
        lots={dpgfState.dpgf?.lots ?? []}
        isLoading={dpgfState.isLoading}
        error={dpgfState.error}
        search={search}
        isReadOnly={isLocked}
        onAddLot={dpgfState.addLot}
        onUpdateLot={dpgfState.updateLot}
        onDeleteLot={dpgfState.deleteLot}
        onReorderLots={dpgfState.reorderLots}
        onAddSubLot={dpgfState.addSubLot}
        onUpdateSubLot={dpgfState.updateSubLot}
        onDeleteSubLot={dpgfState.deleteSubLot}
        onAddPost={dpgfState.addPost}
        onUpdatePost={dpgfState.updatePost}
        onDeletePost={dpgfState.deletePost}
        onSaveToLibrary={saveToLibrary}
      />

      {/* Library sheet */}
      <LibrarySheet
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        dpgfId={dpgfId}
        lots={dpgfState.dpgf?.lots ?? []}
        onInserted={() => {
          dpgfState.refresh()
          refreshLibraryCount()
        }}
      />

      {/* Import IA */}
      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        dpgfId={dpgfId}
        projectId={projectId}
      />

      {/* Modale unlock */}
      <Dialog open={showUnlockModal} onOpenChange={setShowUnlockModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le DPGF ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: 'var(--text2)' }}>
            Modifier le DPGF <strong style={{ color: 'var(--text)' }}>notifiera toutes les entreprises
            invitées</strong> et réinitialisera leurs offres en cours. Cette action est irréversible.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnlockModal(false)} disabled={unlocking}>
              Annuler
            </Button>
            <Button
              onClick={handleUnlock}
              disabled={unlocking}
              style={{ background: 'var(--green-btn)', color: '#fff', border: 'none' }}
            >
              {unlocking ? 'En cours…' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
