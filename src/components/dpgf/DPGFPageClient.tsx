'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDPGF } from '@/hooks/useDPGF'
import { StatsBar } from './StatsBar'
import { DPGFToolbar } from './DPGFToolbar'
import { DPGFTable } from './DPGFTable'
import { LibrarySheet } from './LibrarySheet'

interface DPGFPageClientProps {
  dpgfId: string
  projectName: string
}

export function DPGFPageClient({ dpgfId, projectName }: DPGFPageClientProps) {
  const dpgfState = useDPGF(dpgfId)
  const [search, setSearch]         = useState('')
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [libraryCount, setLibraryCount] = useState<number | undefined>(undefined)

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
            DPGF
          </h1>
        </div>
      </div>

      {/* Stats */}
      <StatsBar dpgf={dpgfState.dpgf} libraryCount={libraryCount} />

      {/* Toolbar */}
      <DPGFToolbar
        search={search}
        onSearchChange={setSearch}
        onImport={() => {}}
        onExportPdf={() => {}}
        onLaunchAO={() => {}}
        onOpenLibrary={() => setLibraryOpen(true)}
      />

      {/* Tableau */}
      <DPGFTable
        lots={dpgfState.dpgf?.lots ?? []}
        isLoading={dpgfState.isLoading}
        error={dpgfState.error}
        search={search}
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
    </div>
  )
}
