'use client'

import { Search } from 'lucide-react'

interface DPGFToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  onImport: () => void
  onExportPdf: () => void
  onLaunchAO: () => void
  onOpenLibrary: () => void
}

export function DPGFToolbar({
  search,
  onSearchChange,
  onImport,
  onExportPdf,
  onLaunchAO,
  onOpenLibrary,
}: DPGFToolbarProps) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Recherche */}
      <div className="relative flex-1 max-w-xs">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
          style={{ color: 'var(--text3)' }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher un poste…"
          className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md outline-none"
          style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenLibrary}
          className="px-3 py-1.5 text-sm rounded-md border font-medium"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--text2)',
            background: 'var(--surface)',
          }}
        >
          + Depuis bibliothèque
        </button>
        <button
          onClick={onImport}
          className="px-3 py-1.5 text-sm rounded-md border"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--text2)',
            background: 'var(--surface)',
          }}
        >
          Importer
        </button>
        <button
          onClick={onExportPdf}
          className="px-3 py-1.5 text-sm rounded-md border"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--text2)',
            background: 'var(--surface)',
          }}
        >
          Exporter PDF
        </button>
        <button
          onClick={onLaunchAO}
          className="px-4 py-1.5 text-sm rounded-md font-medium"
          style={{ background: 'var(--green-btn)', color: '#fff' }}
        >
          Lancer l&apos;AO
        </button>
      </div>
    </div>
  )
}
