'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { LotWithChildren } from '@/types'
import { STANDARD_LOTS } from '@/lib/standard-lots'

// Ré-exporté pour compatibilité avec DPGFTable (dialog "Sauvegarder en bibliothèque")
export const TRADES = STANDARD_LOTS

interface LibraryItem {
  id:         string
  intitule:   string
  unite:      string | null
  lot:        string
  sousLot:    string | null
  usageCount: number
}

interface LibrarySheetProps {
  open: boolean
  onClose: () => void
  dpgfId: string
  lots: LotWithChildren[]
  onInserted: () => void
}

export function LibrarySheet({ open, onClose, dpgfId, lots, onInserted }: LibrarySheetProps) {
  const [search, setSearch]               = useState('')
  const [lot, setLot]                     = useState('')
  const [selectedLotId, setSelectedLotId] = useState('')
  const [items, setItems]                 = useState<LibraryItem[]>([])
  const [availableLots, setAvailableLots] = useState<string[]>([])
  const [loading, setLoading]             = useState(false)
  const [inserting, setInserting]         = useState<string | null>(null)

  // Default to first lot
  useEffect(() => {
    if (lots.length > 0 && !selectedLotId) {
      setSelectedLotId(lots[0].id)
    }
  }, [lots, selectedLotId])

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (lot)    params.set('lot', lot)
      const res  = await fetch(`/api/library/items?${params.toString()}`)
      const data = await res.json() as { items: LibraryItem[]; lots: string[] }
      setItems(Array.isArray(data.items) ? data.items : [])
      if (Array.isArray(data.lots) && data.lots.length > 0) {
        setAvailableLots(data.lots)
      }
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [search, lot])

  useEffect(() => {
    if (open) fetchItems()
  }, [open, fetchItems])

  async function handleInsert(libraryItemId: string) {
    if (!selectedLotId) return
    setInserting(libraryItemId)
    try {
      const res = await fetch(
        `/api/dpgf/${dpgfId}/lots/${selectedLotId}/posts/from-library-item`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ libraryItemId }),
        }
      )
      if (res.ok) {
        onInserted()
        setItems((prev) =>
          prev.map((i) => (i.id === libraryItemId ? { ...i, usageCount: i.usageCount + 1 } : i))
        )
      }
    } finally {
      setInserting(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent
        className="flex flex-col gap-0 overflow-hidden"
        style={{ width: '440px', maxWidth: '100vw', background: 'var(--surface)', height: '100%' }}
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <SheetTitle style={{ fontFamily: 'var(--font-dm-serif)', color: 'var(--text)', fontSize: '1.25rem' }}>
            Bibliothèque d&apos;intitulés
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-6 pt-4 pb-3">
          {/* Lot selector */}
          {lots.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text2)' }}>
                Insérer dans le lot
              </label>
              <select
                value={selectedLotId}
                onChange={(e) => setSelectedLotId(e.target.value)}
                className="w-full text-sm px-3 py-1.5 rounded-md outline-none"
                style={{
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  background: 'var(--surface2)',
                }}
              >
                {lots.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.number} — {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
              style={{ color: 'var(--text3)' }}
            />
            <input
              type="text"
              placeholder="Rechercher un intitulé…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md outline-none"
              style={{
                border: '1px solid var(--border)',
                background: 'var(--surface2)',
                color: 'var(--text)',
              }}
            />
          </div>

          {/* Lot filter — valeurs réelles de la BDD */}
          <select
            value={lot}
            onChange={(e) => setLot(e.target.value)}
            className="w-full text-sm px-3 py-1.5 rounded-md outline-none"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--text)',
              background: 'var(--surface2)',
            }}
          >
            <option value="">Tous les lots</option>
            {availableLots.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-1.5">
          {loading ? (
            <p className="text-sm text-center py-10" style={{ color: 'var(--text3)' }}>
              Chargement…
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: 'var(--text3)' }}>
              Aucun intitulé{search || lot ? ' pour cette recherche' : ''}
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                    {item.intitule}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {item.unite && (
                      <span className="text-xs" style={{ color: 'var(--text3)' }}>
                        {item.unite}
                      </span>
                    )}
                    {item.sousLot && (
                      <span className="text-xs" style={{ color: 'var(--text2)' }}>
                        {item.sousLot}
                      </span>
                    )}
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-medium"
                      style={{ background: 'var(--green-light)', color: 'var(--green)' }}
                    >
                      {item.lot}
                    </span>
                    {item.usageCount > 0 && (
                      <span className="text-xs" style={{ color: 'var(--text3)' }}>
                        ×{item.usageCount}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleInsert(item.id)}
                  disabled={inserting === item.id || !selectedLotId}
                  className="p-1.5 rounded-md transition-colors shrink-0 disabled:opacity-50"
                  style={{ background: 'var(--green-light)', color: 'var(--green)' }}
                  title="Insérer dans le DQE"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

