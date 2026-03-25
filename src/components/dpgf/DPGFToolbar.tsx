'use client'

import { Search, Sparkles, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface DPGFToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  onImport: () => void
  onOpenLibrary: () => void
  onAiGenerate?: () => void
}

export function DPGFToolbar({
  search,
  onSearchChange,
  onImport,
  onOpenLibrary,
  onAiGenerate,
}: DPGFToolbarProps) {
  return (
    <div
      className="rounded-lg px-3 py-2"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Desktop layout */}
      <div className="hidden sm:flex items-center justify-between gap-3">
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

        {/* Actions desktop */}
        <div className="flex items-center gap-2">
          <button
            onClick={onAiGenerate}
            className="px-3 py-1.5 text-sm rounded-md font-medium flex items-center gap-1.5"
            style={{ background: 'var(--green-light)', color: 'var(--green)', border: '1px solid var(--green)' }}
          >
            <Sparkles size={14} />
            Générer avec l&apos;IA
          </button>
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
        </div>
      </div>

      {/* Mobile layout */}
      <div className="flex sm:hidden items-center gap-2">
        {/* Recherche pleine largeur */}
        <div className="relative flex-1">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: 'var(--text3)' }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher…"
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md outline-none"
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          />
        </div>

        {/* Actions regroupées en dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-1 px-2.5 py-1.5 text-sm rounded-md border flex-shrink-0"
              style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--surface)' }}
            >
              Actions
              <ChevronDown size={13} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <DropdownMenuItem
              onClick={onAiGenerate}
              className="gap-2 cursor-pointer text-sm"
              style={{ color: 'var(--green)' }}
            >
              <Sparkles size={14} />
              Générer avec l&apos;IA
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onOpenLibrary}
              className="gap-2 cursor-pointer text-sm"
              style={{ color: 'var(--text)' }}
            >
              + Depuis bibliothèque
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onImport}
              className="gap-2 cursor-pointer text-sm"
              style={{ color: 'var(--text)' }}
            >
              Importer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
