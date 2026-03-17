'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ChevronRight, ChevronDown, Trash2, Plus, Check, MoreHorizontal, BookMarked, Tag } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { TRADES } from './LibrarySheet'
import type { LotWithChildren, SubLotWithPosts, CreatePostInput } from '@/types'
import type { Post } from '@prisma/client'

// ── Column layout ──────────────────────────────────────────────────────────────
const COLS = '28px 100px 1fr 96px 96px 116px 116px 44px'

// ── Unit options ───────────────────────────────────────────────────────────────
const UNITS = ['m²', 'm³', 'ml', 'u', 'kg', 't', 'h', 'j', 'forfait', 'ens.', 'lot', 'pm']

// ── Types ──────────────────────────────────────────────────────────────────────
type FlatRow =
  | { kind: 'lot'; lot: LotWithChildren }
  | { kind: 'sublot'; sublot: SubLotWithPosts; lot: LotWithChildren }
  | { kind: 'post'; post: Post; lot: LotWithChildren; sublot?: SubLotWithPosts }
  | { kind: 'add-sublot'; lot: LotWithChildren }
  | { kind: 'add-post'; lot: LotWithChildren; sublot?: SubLotWithPosts }
  | { kind: 'add-lot' }

interface DPGFTableProps {
  lots: LotWithChildren[]
  isLoading: boolean
  error: string | null
  search: string
  isReadOnly?: boolean
  onAddLot: (name: string) => Promise<void>
  onUpdateLot: (lotId: string, data: { name?: string; position?: number }) => Promise<void>
  onDeleteLot: (lotId: string) => Promise<void>
  onReorderLots: (items: { lotId: string; position: number }[]) => Promise<void>
  onAddSubLot: (lotId: string, data: { number: string; name: string }) => Promise<void>
  onUpdateSubLot: (
    lotId: string,
    sublotId: string,
    data: { number?: string; name?: string }
  ) => Promise<void>
  onDeleteSubLot: (lotId: string, sublotId: string) => Promise<void>
  onAddPost: (lotId: string, data: CreatePostInput) => Promise<void>
  onUpdatePost: (
    lotId: string,
    postId: string,
    data: {
      title?: string
      unit?: string
      qtyArchi?: number | null
      unitPriceArchi?: number | null
      isOptional?: boolean
    }
  ) => Promise<void>
  onDeletePost: (lotId: string, postId: string) => Promise<void>
  onSaveToLibrary: (lotId: string, postId: string, data: { trade?: string | null }) => Promise<void>
  onMovePost: (postId: string, targetLotId: string, targetSublotId: string | null) => Promise<void>
  onMoveSublot: (sublotId: string, targetLotId: string) => Promise<void>
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── LotRow ─────────────────────────────────────────────────────────────────────
interface LotRowProps {
  lot: LotWithChildren
  collapsed: boolean
  onToggle: () => void
  onRename: (name: string) => Promise<void>
  onDelete: () => Promise<void>
  isReadOnly: boolean
}

function LotRow({ lot, collapsed, onToggle, onRename, onDelete, isReadOnly }: LotRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lot.id,
  })
  const [editName, setEditName] = useState<string | null>(null)

  async function commitRename() {
    const v = editName?.trim()
    if (v && v !== lot.name) await onRename(v)
    setEditName(null)
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        background: 'var(--green)',
        color: '#FFFFFF',
      }}
      className="flex items-center gap-2 px-3 py-2.5 select-none"
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
        style={{ color: 'rgba(255,255,255,0.3)' }}
      >
        <GripVertical className="w-4 h-4" />
      </span>

      <span
        className="px-2 py-0.5 rounded text-xs font-bold text-white shrink-0"
        style={{ background: 'var(--green)' }}
      >
        {lot.number}
      </span>

      {editName !== null ? (
        <input
          autoFocus
          className="flex-1 outline-none text-sm font-medium rounded-md"
          style={{
            color: '#FFFFFF',
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.35)',
            boxShadow: '0 0 0 2px rgba(255,255,255,0.08)',
            padding: '3px 8px',
          }}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') setEditName(null)
          }}
        />
      ) : (
        <span
          className={`flex-1 text-sm font-medium rounded-md px-2 py-0.5 transition-colors ${isReadOnly ? '' : 'cursor-text'}`}
          style={{ border: '1px solid transparent' }}
          onDoubleClick={() => { if (!isReadOnly) setEditName(lot.name) }}
          onMouseEnter={(e) => { if (!isReadOnly) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)' }}
          onMouseLeave={(e) => { if (!isReadOnly) e.currentTarget.style.borderColor = 'transparent' }}
        >
          {lot.name}
        </span>
      )}

      <div className="flex items-center gap-1 ml-auto shrink-0">
        {!isReadOnly && (
        <button
          onClick={async () => {
            if (confirm(`Supprimer le lot "${lot.name}" et tous ses postes ?`)) {
              await onDelete()
            }
          }}
          className="p-1 transition-opacity"
          style={{ opacity: 0.3, color: '#FFFFFF' }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.3')}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        )}
        <button onClick={onToggle} className="p-1" style={{ color: '#FFFFFF' }}>
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

// ── SubLotRow ──────────────────────────────────────────────────────────────────
interface SubLotRowProps {
  sublot: SubLotWithPosts
  lot: LotWithChildren
  collapsed: boolean
  onToggle: () => void
  onUpdate: (data: { number?: string; name?: string }) => Promise<void>
  onDelete: () => Promise<void>
  isReadOnly: boolean
}

function SubLotRow({ sublot, lot, collapsed, onToggle, onUpdate, onDelete, isReadOnly }: SubLotRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sublot.id,
  })
  const [editName, setEditName] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const depth = (sublot.number.match(/\./g) ?? []).length
  const paddingLeft = 36 + depth * 16

  async function commitEdit() {
    if (editName === null) return
    const name = editName.trim()
    if (name && name !== sublot.name) {
      await onUpdate({ name })
    }
    setEditName(null)
    setNameError(null)
  }

  return (
    <div
      ref={setNodeRef}
      className="flex items-center gap-2 pr-3 py-2 border-b"
      style={{
        paddingLeft: `${paddingLeft}px`,
        background: 'var(--surface2)',
        borderColor: 'var(--border)',
        color: 'var(--text)',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      {!isReadOnly && (
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none -ml-4 shrink-0"
          style={{ color: 'var(--text3)', opacity: 0.5 }}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </span>
      )}
      <span
        className="text-sm font-bold shrink-0"
        style={{ color: 'var(--green-mid)' }}
      >
        {lot.number}.{sublot.number}
      </span>

      {editName !== null ? (
        <div className="flex-1 flex flex-col">
          <input
            autoFocus
            className="w-full text-sm font-semibold outline-none rounded-md"
            style={{
              border: `1px solid ${nameError ? 'var(--red)' : 'var(--green-mid)'}`,
              boxShadow: nameError ? '0 0 0 2px rgba(155,28,28,0.1)' : '0 0 0 2px rgba(45,122,80,0.1)',
              padding: '4px 8px',
              color: 'var(--text)',
              background: 'var(--surface)',
            }}
            value={editName}
            onChange={(e) => { setEditName(e.target.value); setNameError(null) }}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') { setEditName(null); setNameError(null) }
            }}
          />
          {nameError && <span className="text-xs mt-0.5" style={{ color: 'var(--red)' }}>{nameError}</span>}
        </div>
      ) : (
        <span
          className={`flex-1 text-sm font-semibold rounded-md px-2 py-1 transition-colors ${isReadOnly ? '' : 'cursor-text hover:bg-white/60'}`}
          style={{
            border: isReadOnly ? 'none' : '1px solid transparent',
          }}
          onDoubleClick={() => { if (!isReadOnly) setEditName(sublot.name) }}
          onMouseEnter={(e) => { if (!isReadOnly) e.currentTarget.style.borderColor = 'var(--border)' }}
          onMouseLeave={(e) => { if (!isReadOnly) e.currentTarget.style.borderColor = 'transparent' }}
        >
          {sublot.name}
        </span>
      )}

      <div className="flex items-center gap-1 ml-auto shrink-0">
        {!isReadOnly && (
        <button
          onClick={async () => {
            if (confirm(`Supprimer le sous-lot "${sublot.name}" et ses postes ?`)) {
              await onDelete()
            }
          }}
          className="p-1 transition-opacity"
          style={{ color: 'var(--text3)', opacity: 0.5 }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1'
            e.currentTarget.style.color = 'var(--red)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.5'
            e.currentTarget.style.color = 'var(--text3)'
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        )}
        <button onClick={onToggle} className="p-1" style={{ color: 'var(--text2)' }}>
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

// ── TitleAutocomplete ─────────────────────────────────────────────────────────
interface Suggestion { id: string; intitule: string; unite: string | null }

function TitleAutocomplete({
  defaultValue,
  lotName,
  onCommit,
  onCancel,
}: {
  defaultValue: string
  lotName: string
  onCommit: (title: string, unite?: string, fromEnter?: boolean) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(defaultValue)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function fetchSuggestions(q: string) {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (q.length < 2) { setSuggestions([]); setOpen(false); return }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/library/suggestions?lot=${encodeURIComponent(lotName)}&q=${encodeURIComponent(q)}`)
        if (res.ok) {
          const data: Suggestion[] = await res.json()
          setSuggestions(data)
          setOpen(data.length > 0)
          setActiveIdx(-1)
        }
      } catch { /* ignore */ }
    }, 250)
  }

  function selectSuggestion(s: Suggestion) {
    void fetch(`/api/library/${s.id}/use`, { method: 'PATCH' })
    setOpen(false)
    onCommit(s.intitule, s.unite ?? undefined, true)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && suggestions[activeIdx]) {
        selectSuggestion(suggestions[activeIdx])
      } else {
        setOpen(false)
        onCommit(value, undefined, true)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      onCancel()
    }
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <input
        ref={inputRef}
        className="w-full text-sm outline-none rounded-md"
        style={{ border: 'none', padding: '4px 8px', color: 'var(--text)', background: 'transparent' }}
        value={value}
        onChange={(e) => { setValue(e.target.value); fetchSuggestions(e.target.value) }}
        onBlur={(e) => {
          // Delay to allow click on dropdown
          setTimeout(() => {
            if (!wrapRef.current?.contains(document.activeElement)) {
              setOpen(false)
              onCommit(e.target.value)
            }
          }, 150)
        }}
        onKeyDown={handleKeyDown}
      />
      {open && (
        <div
          className="absolute left-0 top-full mt-0.5 rounded-lg overflow-hidden z-50 w-full"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto', minWidth: 240 }}
        >
          {suggestions.map((s, idx) => (
            <div
              key={s.id}
              className="px-3 py-2 cursor-pointer text-sm"
              style={{
                background: idx === activeIdx ? 'var(--green-light)' : 'var(--surface)',
                color: 'var(--text)',
                borderBottom: idx < suggestions.length - 1 ? '1px solid var(--border)' : undefined,
              }}
              onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s) }}
              onMouseEnter={() => setActiveIdx(idx)}
            >
              <span>{s.intitule}</span>
              {s.unite && <span className="ml-2 text-xs font-mono" style={{ color: 'var(--text3)' }}>{s.unite}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── PostRow ────────────────────────────────────────────────────────────────────
interface PostRowProps {
  post: Post
  sublot?: SubLotWithPosts
  lotName: string
  isReadOnly: boolean
  onUpdate: (data: {
    title?: string
    unit?: string
    qtyArchi?: number | null
    unitPriceArchi?: number | null
    isOptional?: boolean
  }) => Promise<void>
  onDelete: () => Promise<void>
  onSaveToLibrary: (data: { trade?: string | null }) => Promise<void>
}

function PostRow({ post, sublot, lotName, isReadOnly, onUpdate, onDelete, onSaveToLibrary }: PostRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: post.id,
  })
  const [localPost, setLocalPost] = useState(post)
  const [editField, setEditField] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync from server when post data changes and we're not actively editing
  useEffect(() => {
    if (editField === null) {
      setLocalPost(post)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.title, post.unit, post.qtyArchi, post.unitPriceArchi, post.isOptional, post.ref])

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  const total =
    localPost.qtyArchi != null && localPost.unitPriceArchi != null
      ? localPost.qtyArchi * localPost.unitPriceArchi
      : null

  async function commitEdit(field: string, raw: string, nextField: string | null = null) {
    let parsed: {
      title?: string
      unit?: string
      qtyArchi?: number | null
      unitPriceArchi?: number | null
      isOptional?: boolean
    } = {}
    if (field === 'title') {
      parsed = { title: raw }
    } else if (field === 'unit') {
      parsed = { unit: raw }
    } else if (field === 'qtyArchi') {
      const n = parseFloat(raw.replace(',', '.'))
      parsed = { qtyArchi: isNaN(n) ? null : n }
    } else if (field === 'unitPriceArchi') {
      const n = parseFloat(raw.replace(',', '.'))
      parsed = { unitPriceArchi: isNaN(n) ? null : n }
    }
    setLocalPost((p) => ({ ...p, ...parsed }))
    setEditField(nextField)
    try {
      await onUpdate(parsed)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      setSaved(true)
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000)
    } catch {
      // ignore
    }
  }

  async function toggleOptional() {
    const next = !localPost.isOptional
    setLocalPost((p) => ({ ...p, isOptional: next }))
    try {
      await onUpdate({ isOptional: next })
    } catch {
      // ignore
    }
  }

  return (
    <div
      ref={setNodeRef}
      className="grid items-center border-b bg-white hover:bg-neutral-50 transition-colors group"
      style={{
        gridTemplateColumns: COLS,
        borderColor: 'var(--border)',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      {/* Grip */}
      <div className="flex items-center justify-center py-2">
        {!isReadOnly && (
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity"
            style={{ color: 'var(--text3)' }}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      {/* Réf */}
      <div
        className="flex items-center gap-1.5 py-2 text-xs font-mono"
        style={{ paddingLeft: sublot ? '16px' : '4px', paddingRight: '8px', color: 'var(--text3)' }}
      >
        {sublot && (
          <span
            className="w-0.5 h-3 rounded-full shrink-0"
            style={{ background: 'var(--green-mid)' }}
          />
        )}
        <span className="truncate">{post.ref}</span>
        {saved && <Check className="w-3 h-3 shrink-0" style={{ color: 'var(--green-mid)' }} />}
      </div>

      {/* Désignation */}
      <div className="px-2 py-1.5 flex items-center gap-2 min-w-0">
        {editField === 'title' ? (
          <div
            className="flex-1 rounded-md"
            style={{ border: '1px solid var(--green-mid)', boxShadow: '0 0 0 2px rgba(45,122,80,0.1)', background: 'var(--surface)' }}
          >
            <TitleAutocomplete
              defaultValue={localPost.title}
              lotName={lotName}
              onCommit={(title, unite, fromEnter) => {
                const updates: { title: string; unit?: string } = { title }
                if (unite) updates.unit = unite
                setLocalPost((p) => ({ ...p, ...updates }))
                setEditField(fromEnter ? 'qtyArchi' : null)
                void onUpdate(updates).then(() => {
                  if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
                  setSaved(true)
                  savedTimerRef.current = setTimeout(() => setSaved(false), 2000)
                })
              }}
              onCancel={() => setEditField(null)}
            />
          </div>
        ) : (
          <span
            className={`text-sm truncate flex-1 rounded-md px-2 py-1 transition-colors ${isReadOnly ? '' : 'cursor-text hover:bg-neutral-50'}`}
            style={{
              color: localPost.title ? 'var(--text)' : 'var(--text3)',
              border: isReadOnly ? 'none' : '1px solid var(--border)',
              background: isReadOnly ? 'transparent' : 'var(--surface)',
            }}
            onClick={() => { if (!isReadOnly) setEditField('title') }}
          >
            {localPost.title || 'Désignation…'}
          </span>
        )}
        {localPost.isOptional && (
          <span
            className="text-xs px-1.5 py-0.5 rounded shrink-0 font-medium"
            style={{ background: 'var(--amber-light)', color: 'var(--amber)' }}
          >
            OPT
          </span>
        )}
      </div>

      {/* Unité */}
      <div className="px-2 py-1.5">
        {isReadOnly ? (
          <span className="text-sm text-right block" style={{ color: 'var(--text2)' }}>
            {localPost.unit}
          </span>
        ) : (
          <select
            value={UNITS.includes(localPost.unit) ? localPost.unit : ''}
            onChange={async (e) => {
              const val = e.target.value
              setLocalPost((p) => ({ ...p, unit: val }))
              try { await onUpdate({ unit: val }) } catch { /* ignore */ }
            }}
            className="w-full text-sm outline-none rounded-md transition-colors"
            style={{
              border: '1px solid var(--border)',
              padding: '4px 6px',
              color: 'var(--text)',
              background: 'var(--surface)',
              cursor: 'pointer',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--green-mid)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(45,122,80,0.1)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
            onKeyDown={(e) => { if (e.key === 'Enter') setEditField('qtyArchi') }}
          >
            {!UNITS.includes(localPost.unit) && <option value="">{localPost.unit}</option>}
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        )}
      </div>

      {/* Quantité */}
      <div className="px-2 py-1.5">
        {editField === 'qtyArchi' ? (
          <input
            autoFocus
            className="w-full text-sm text-right outline-none rounded-md"
            style={{
              border: '1px solid var(--green-mid)',
              boxShadow: '0 0 0 2px rgba(45,122,80,0.1)',
              padding: '4px 8px',
              color: 'var(--text)',
              background: 'var(--surface)',
            }}
            defaultValue={localPost.qtyArchi?.toString() ?? ''}
            onBlur={(e) => commitEdit('qtyArchi', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit('qtyArchi', e.currentTarget.value, 'unitPriceArchi')
              if (e.key === 'Escape') setEditField(null)
            }}
          />
        ) : (
          <span
            className={`text-sm text-right block rounded-md px-2 py-1 transition-colors ${isReadOnly ? '' : 'cursor-text hover:bg-neutral-50'}`}
            style={{
              color: localPost.qtyArchi == null ? 'var(--amber)' : 'var(--text2)',
              border: isReadOnly ? 'none' : '1px solid var(--border)',
              background: isReadOnly ? 'transparent' : 'var(--surface)',
            }}
            onClick={() => { if (!isReadOnly) setEditField('qtyArchi') }}
          >
            {localPost.qtyArchi != null ? localPost.qtyArchi.toLocaleString('fr-FR') : '—'}
          </span>
        )}
      </div>

      {/* Prix U. */}
      <div className="px-2 py-1.5">
        {editField === 'unitPriceArchi' ? (
          <input
            autoFocus
            className="w-full text-sm text-right outline-none rounded-md"
            style={{
              border: '1px solid var(--green-mid)',
              boxShadow: '0 0 0 2px rgba(45,122,80,0.1)',
              padding: '4px 8px',
              color: 'var(--text)',
              background: 'var(--surface)',
            }}
            defaultValue={localPost.unitPriceArchi?.toString() ?? ''}
            onBlur={(e) => commitEdit('unitPriceArchi', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit('unitPriceArchi', e.currentTarget.value)
              if (e.key === 'Escape') setEditField(null)
            }}
          />
        ) : (
          <span
            className={`text-sm text-right block rounded-md px-2 py-1 transition-colors ${isReadOnly ? '' : 'cursor-text hover:bg-neutral-50'}`}
            style={{
              color: localPost.unitPriceArchi == null ? 'var(--amber)' : 'var(--text2)',
              border: isReadOnly ? 'none' : '1px solid var(--border)',
              background: isReadOnly ? 'transparent' : 'var(--surface)',
            }}
            onClick={() => { if (!isReadOnly) setEditField('unitPriceArchi') }}
          >
            {localPost.unitPriceArchi != null ? fmt(localPost.unitPriceArchi) + ' €' : '—'}
          </span>
        )}
      </div>

      {/* Total */}
      <div
        className="px-2 py-2 text-sm text-right font-medium"
        style={{ color: total != null ? 'var(--text)' : 'var(--text3)' }}
      >
        {total != null ? fmt(total) + ' €' : '—'}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center">
        {!isReadOnly && (
          <PostActions post={localPost} onDelete={onDelete} onSaveToLibrary={onSaveToLibrary} onToggleOptional={toggleOptional} />
        )}
      </div>
    </div>
  )
}

// ── PostActions (dropdown ⋯) ───────────────────────────────────────────────────
function PostActions({
  post,
  onDelete,
  onSaveToLibrary,
  onToggleOptional,
}: {
  post: Post
  onDelete: () => Promise<void>
  onSaveToLibrary: (data: { trade?: string | null }) => Promise<void>
  onToggleOptional: () => Promise<void>
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [trade, setTrade] = useState<string>('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await onSaveToLibrary({ trade: trade || null })
      setDialogOpen(false)
      setTrade('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-1 rounded opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity"
            style={{ color: 'var(--text2)' }}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <DropdownMenuItem
            onClick={onToggleOptional}
            className="gap-2 cursor-pointer text-sm"
            style={{ color: post.isOptional ? 'var(--amber)' : 'var(--text)' }}
          >
            <Tag className="w-3.5 h-3.5" />
            {post.isOptional ? "Retirer l'option" : 'Marquer comme optionnel'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setDialogOpen(true)}
            className="gap-2 cursor-pointer text-sm"
            style={{ color: 'var(--text)' }}
          >
            <BookMarked className="w-3.5 h-3.5" />
            Enregistrer dans la bibliothèque
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              if (confirm(`Supprimer le poste "${post.title}" ?`)) {
                await onDelete()
              }
            }}
            className="gap-2 cursor-pointer text-sm"
            style={{ color: 'var(--red)' }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-dm-serif)', color: 'var(--text)' }}>
              Enregistrer dans la bibliothèque
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <p className="text-sm" style={{ color: 'var(--text2)' }}>
              <span className="font-medium" style={{ color: 'var(--text)' }}>{post.title}</span>
              {post.unitPriceArchi != null && (
                <span> — {post.unitPriceArchi.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
              )}
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text2)' }}>
                Corps de métier
              </label>
              <select
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
                className="w-full text-sm px-3 py-1.5 rounded-md outline-none"
                style={{ border: '1px solid var(--border)', color: 'var(--text)', background: 'var(--surface2)' }}
              >
                <option value="">— Sans catégorie</option>
                {TRADES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving} style={{ background: 'var(--green-btn)', color: '#fff', border: 'none' }}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── AddPostRow ─────────────────────────────────────────────────────────────────
interface AddPostRowProps {
  lot: LotWithChildren
  sublot?: SubLotWithPosts
  onAdd: (lotId: string, data: CreatePostInput) => Promise<void>
}

function AddPostRow({ lot, sublot, onAdd }: AddPostRowProps) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [unit, setUnit] = useState('u')
  const indentPx = sublot ? 16 : 4

  if (!adding) {
    return (
      <div
        className="flex items-center gap-1.5 py-1.5 border-b cursor-pointer text-xs hover:bg-neutral-50 transition-colors"
        style={{ paddingLeft: `${28 + indentPx}px`, borderColor: 'var(--border)', color: 'var(--text3)' }}
        onClick={() => setAdding(true)}
      >
        <Plus className="w-3 h-3" />
        Ajouter un poste
      </div>
    )
  }

  return (
    <div
      className="grid items-center border-b"
      style={{ gridTemplateColumns: COLS, borderColor: 'var(--border)', background: 'var(--green-light)' }}
    >
      <div /> {/* grip column */}
      <div style={{ paddingLeft: `${indentPx}px` }} />
      <div className="px-2 py-1.5">
        <input
          autoFocus
          className="w-full text-sm outline-none rounded-md"
          style={{
            border: '1px solid var(--green-mid)',
            boxShadow: '0 0 0 2px rgba(45,122,80,0.1)',
            padding: '4px 8px',
            color: 'var(--text)',
            background: 'var(--surface)',
          }}
          placeholder="Intitulé du poste…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key === 'Enter' && title.trim()) {
              await onAdd(lot.id, { title: title.trim(), unit, sublotId: sublot?.id ?? null })
              setTitle('')
              setAdding(false)
            }
            if (e.key === 'Escape') {
              setTitle('')
              setAdding(false)
            }
          }}
        />
      </div>
      <div className="px-2 py-1.5">
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="w-full text-sm outline-none rounded-md"
          style={{
            border: '1px solid var(--green-mid)',
            boxShadow: '0 0 0 2px rgba(45,122,80,0.1)',
            padding: '4px 6px',
            color: 'var(--text)',
            background: 'var(--surface)',
          }}
          onKeyDown={async (e) => {
            if (e.key === 'Enter' && title.trim()) {
              await onAdd(lot.id, { title: title.trim(), unit, sublotId: sublot?.id ?? null })
              setTitle('')
              setAdding(false)
            }
            if (e.key === 'Escape') { setTitle(''); setAdding(false) }
          }}
        >
          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <div /><div /><div />
      <div className="flex items-center justify-center">
        <button
          onClick={() => { setTitle(''); setAdding(false) }}
          className="p-1 text-xs"
          style={{ color: 'var(--text3)' }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

// ── AddSubLotRow ───────────────────────────────────────────────────────────────
interface AddSubLotRowProps {
  lot: LotWithChildren
  onAdd: (lotId: string, data: { number: string; name: string }) => Promise<void>
}

function AddSubLotRow({ lot, onAdd }: AddSubLotRowProps) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  if (!adding) {
    return (
      <div
        className="flex items-center gap-1.5 px-5 py-1.5 border-b cursor-pointer text-xs transition-colors"
        style={{ borderColor: 'var(--border)', background: 'var(--surface2)', color: 'var(--text3)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#EAEAE6')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
        onClick={() => setAdding(true)}
      >
        <Plus className="w-3 h-3" />
        Ajouter un sous-lot
      </div>
    )
  }

  function nextNumber() {
    const max = Math.max(0, ...lot.sublots.map((sl) => parseInt(sl.number) || 0))
    return String(max + 1)
  }

  async function commit() {
    if (name.trim()) {
      await onAdd(lot.id, { number: nextNumber(), name: name.trim() })
      setName('')
      setAdding(false)
    }
  }

  return (
    <div
      className="flex items-center gap-2 px-5 py-1.5 border-b"
      style={{ borderColor: 'var(--border)', background: 'var(--green-light)' }}
    >
      <span
        className="text-sm font-bold shrink-0"
        style={{ color: 'var(--green-mid)' }}
      >
        {lot.number}.{nextNumber()}
      </span>
      <input
        autoFocus
        className="flex-1 text-sm font-semibold outline-none rounded-md"
        style={{
          border: '1px solid var(--green-mid)',
          boxShadow: '0 0 0 2px rgba(45,122,80,0.1)',
          padding: '4px 8px',
          color: 'var(--text)',
          background: 'var(--surface)',
        }}
        placeholder="Nom du sous-lot…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setAdding(false)
        }}
      />
      <button
        onClick={() => setAdding(false)}
        className="p-1 shrink-0"
        style={{ color: 'var(--text3)' }}
      >
        ✕
      </button>
    </div>
  )
}

// ── AddLotRow ──────────────────────────────────────────────────────────────────
const STANDARD_LOTS_DPGF = [
  'Démolition / Dépose', 'Gros œuvre / Maçonnerie', 'Charpente bois',
  'Charpente métallique', 'Couverture / Zinguerie', 'Étanchéité',
  'Façades / Ravalement', "Isolation thermique par l'extérieur (ITE)",
  'Menuiseries extérieures / Vitrerie', 'Menuiseries intérieures / Agencement',
  'Cloisons / Plâtrerie / Faux-plafonds', 'Isolation thermique / Acoustique',
  'Carrelage / Faïence', 'Revêtements de sols souples', 'Parquet',
  'Peinture / Finitions', 'Serrurerie / Métallerie', 'Plomberie / Sanitaires',
  'Chauffage / Ventilation / Climatisation (CVC)', 'Électricité courants forts',
  'Courants faibles / Domotique', 'VRD / Terrassement', 'Espaces verts / Paysagisme',
  'Cuisines / Mobilier', 'Ascenseur / Élévateur', 'Divers / Nettoyage',
]

function AddLotRow({ onAdd }: { onAdd: (name: string) => Promise<void> }) {
  const [adding, setAdding] = useState(false)
  const [isCustom, setIsCustom] = useState(false)
  const [customName, setCustomName] = useState('')

  function reset() { setAdding(false); setIsCustom(false); setCustomName('') }

  async function submit(name: string) {
    if (name.trim()) await onAdd(name.trim())
    reset()
  }

  if (!adding) {
    return (
      <div
        className="flex items-center gap-1.5 px-3 py-2.5 cursor-pointer text-sm transition-colors"
        style={{ color: 'var(--text3)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#F0F0EC')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        onClick={() => setAdding(true)}
      >
        <Plus className="w-4 h-4" />
        Ajouter un lot
      </div>
    )
  }

  if (isCustom) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: 'var(--green)' }}>
        <span className="px-2 py-0.5 rounded text-xs font-bold text-white shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }}>?</span>
        <input
          autoFocus
          className="flex-1 text-sm font-medium bg-transparent outline-none border-b"
          style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.3)' }}
          placeholder="Nom du lot personnalisé…"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onBlur={() => submit(customName)}
          onKeyDown={async (e) => {
            if (e.key === 'Enter') await submit(customName)
            if (e.key === 'Escape') reset()
          }}
        />
        <button onClick={reset} className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>✕</button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: 'var(--green)' }}>
      <span className="px-2 py-0.5 rounded text-xs font-bold text-white shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }}>+</span>
      <select
        autoFocus
        className="flex-1 text-sm bg-transparent outline-none"
        style={{ color: '#FFFFFF', background: 'var(--green)' }}
        defaultValue=""
        onChange={async (e) => {
          const val = e.target.value
          if (val === '__custom__') { setIsCustom(true); return }
          if (val) await submit(val)
        }}
        onBlur={(e) => { if (!e.target.value) reset() }}
      >
        <option value="" disabled style={{ background: '#1A5C3A' }}>Choisir un lot…</option>
        {STANDARD_LOTS_DPGF.map((l) => (
          <option key={l} value={l} style={{ background: '#1A5C3A' }}>{l}</option>
        ))}
        <option value="__custom__" style={{ background: '#1A5C3A' }}>✏ Lot personnalisé…</option>
      </select>
      <button onClick={reset} className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>✕</button>
    </div>
  )
}

// ── DPGFTable (main) ───────────────────────────────────────────────────────────
export function DPGFTable({
  lots,
  isLoading,
  error,
  search,
  isReadOnly = false,
  onAddLot,
  onUpdateLot,
  onDeleteLot,
  onReorderLots,
  onAddSubLot,
  onUpdateSubLot,
  onDeleteSubLot,
  onAddPost,
  onUpdatePost,
  onDeletePost,
  onSaveToLibrary,
  onMovePost,
  onMoveSublot,
}: DPGFTableProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [activeDragType, setActiveDragType] = useState<'lot' | 'sublot' | 'post' | null>(null)

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Build drag type lookup map
  const dragTypeMap = useMemo(() => {
    const map = new Map<string, { type: 'lot' | 'sublot' | 'post'; lotId?: string; sublotId?: string }>()
    for (const lot of lots) {
      map.set(lot.id, { type: 'lot' })
      for (const sl of lot.sublots) {
        map.set(sl.id, { type: 'sublot', lotId: lot.id })
        for (const p of sl.posts) {
          map.set(p.id, { type: 'post', lotId: lot.id, sublotId: sl.id })
        }
      }
      for (const p of lot.posts) {
        map.set(p.id, { type: 'post', lotId: lot.id })
      }
    }
    return map
  }, [lots])

  // All draggable IDs for SortableContext
  const allDraggableIds = useMemo(() => {
    return lots.flatMap((l) => [
      l.id,
      ...l.sublots.map((s) => s.id),
      ...l.sublots.flatMap((s) => s.posts.map((p) => p.id)),
      ...l.posts.map((p) => p.id),
    ])
  }, [lots])

  // ── Search filtering ──────────────────────────────────
  const filteredLots = useMemo(() => {
    if (!search.trim()) return lots
    const q = search.toLowerCase()
    return lots
      .map((lot) => ({
        ...lot,
        sublots: lot.sublots
          .map((sl) => ({
            ...sl,
            posts: sl.posts.filter(
              (p) => p.title.toLowerCase().includes(q) || p.ref.toLowerCase().includes(q)
            ),
          }))
          .filter((sl) => sl.posts.length > 0 || sl.name.toLowerCase().includes(q)),
        posts: lot.posts.filter(
          (p) => p.title.toLowerCase().includes(q) || p.ref.toLowerCase().includes(q)
        ),
      }))
      .filter(
        (lot) => lot.name.toLowerCase().includes(q) || lot.sublots.length > 0 || lot.posts.length > 0
      )
  }, [lots, search])

  // ── Flat rows ─────────────────────────────────────────
  const flatRows = useMemo((): FlatRow[] => {
    const rows: FlatRow[] = []
    const forceExpand = search.trim() !== ''

    for (const lot of filteredLots) {
      rows.push({ kind: 'lot', lot })
      const isLotCollapsed = !forceExpand && collapsedIds.has(lot.id)

      if (!isLotCollapsed) {
        for (const sublot of lot.sublots) {
          rows.push({ kind: 'sublot', sublot, lot })
          const isSublotCollapsed = !forceExpand && collapsedIds.has(sublot.id)

          if (!isSublotCollapsed) {
            for (const post of sublot.posts) {
              rows.push({ kind: 'post', post, lot, sublot })
            }
            if (!isReadOnly) rows.push({ kind: 'add-post', lot, sublot })
          }
        }

        for (const post of lot.posts) {
          rows.push({ kind: 'post', post, lot })
        }

        if (!isReadOnly) rows.push({ kind: 'add-sublot', lot })
        if (!isReadOnly) rows.push({ kind: 'add-post', lot })
      }
    }

    if (!isReadOnly) rows.push({ kind: 'add-lot' })
    return rows
  }, [filteredLots, collapsedIds, search])

  // ── DnD ───────────────────────────────────────────────
  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string
    setActiveDragId(id)
    setActiveDragType(dragTypeMap.get(id)?.type ?? null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null)
    setActiveDragType(null)
    if (isReadOnly) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeInfo = dragTypeMap.get(active.id as string)
    const overInfo = dragTypeMap.get(over.id as string)
    if (!activeInfo || !overInfo) return

    // Lot reorder
    if (activeInfo.type === 'lot' && overInfo.type === 'lot') {
      const oldIndex = lots.findIndex((l) => l.id === active.id)
      const newIndex = lots.findIndex((l) => l.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(lots, oldIndex, newIndex)
      await onReorderLots(reordered.map((l, i) => ({ lotId: l.id, position: i })))
      return
    }

    // Post move
    if (activeInfo.type === 'post') {
      let targetLotId: string
      let targetSublotId: string | null = null

      if (overInfo.type === 'lot') {
        targetLotId = over.id as string
      } else if (overInfo.type === 'sublot') {
        targetLotId = overInfo.lotId!
        targetSublotId = over.id as string
      } else if (overInfo.type === 'post') {
        targetLotId = overInfo.lotId!
        targetSublotId = overInfo.sublotId ?? null
      } else {
        return
      }

      // Skip if dropped in the same container
      if (targetLotId === activeInfo.lotId && targetSublotId === (activeInfo.sublotId ?? null)) return
      await onMovePost(active.id as string, targetLotId, targetSublotId)
      return
    }

    // Sublot move
    if (activeInfo.type === 'sublot') {
      let targetLotId: string
      if (overInfo.type === 'lot') {
        targetLotId = over.id as string
      } else if (overInfo.type === 'sublot') {
        targetLotId = overInfo.lotId!
      } else if (overInfo.type === 'post') {
        targetLotId = overInfo.lotId!
      } else {
        return
      }
      if (targetLotId === activeInfo.lotId) return
      await onMoveSublot(active.id as string, targetLotId)
    }
  }

  // Active drag preview data
  const activeLot = activeDragType === 'lot' && activeDragId ? lots.find((l) => l.id === activeDragId) : null
  const activeSublot = activeDragType === 'sublot' && activeDragId
    ? lots.flatMap((l) => l.sublots).find((s) => s.id === activeDragId)
    : null
  const activePost = activeDragType === 'post' && activeDragId
    ? lots.flatMap((l) => [...l.posts, ...l.sublots.flatMap((s) => s.posts)]).find((p) => p.id === activeDragId)
    : null

  // ── Loading / Error ───────────────────────────────────
  if (isLoading) {
    return (
      <div
        className="rounded-[var(--radius-lg)] border p-8 text-center text-sm"
        style={{ borderColor: 'var(--border)', color: 'var(--text3)' }}
      >
        Chargement…
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-[var(--radius-lg)] border p-4 text-sm"
        style={{ borderColor: 'var(--red)', background: 'var(--red-light)', color: 'var(--red)' }}
      >
        {error}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────
  return (
    <div
      className="rounded-[var(--radius-lg)] overflow-hidden border"
      style={{ borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Column header */}
      <div
        className="grid text-xs font-semibold border-b"
        style={{
          gridTemplateColumns: COLS,
          background: 'var(--surface2)',
          borderColor: 'var(--border)',
          color: 'var(--text2)',
        }}
      >
        <div /> {/* grip column */}
        <div className="px-3 py-2.5">Réf</div>
        <div className="px-2 py-2.5">Désignation</div>
        <div className="px-2 py-2.5 text-right">Unité</div>
        <div className="px-2 py-2.5 text-right">Quantité</div>
        <div className="px-2 py-2.5 text-right">Prix U.</div>
        <div className="px-2 py-2.5 text-right">Total</div>
        <div />
      </div>

      {/* Rows */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={allDraggableIds} strategy={verticalListSortingStrategy}>
          {flatRows.map((row) => {
            if (row.kind === 'lot') {
              return (
                <LotRow
                  key={row.lot.id}
                  lot={row.lot}
                  collapsed={collapsedIds.has(row.lot.id)}
                  onToggle={() => toggleCollapse(row.lot.id)}
                  onRename={(name) => onUpdateLot(row.lot.id, { name })}
                  onDelete={() => onDeleteLot(row.lot.id)}
                  isReadOnly={isReadOnly}
                />
              )
            }
            if (row.kind === 'sublot') {
              return (
                <SubLotRow
                  key={row.sublot.id}
                  sublot={row.sublot}
                  lot={row.lot}
                  collapsed={collapsedIds.has(row.sublot.id)}
                  onToggle={() => toggleCollapse(row.sublot.id)}
                  onUpdate={(data) => onUpdateSubLot(row.lot.id, row.sublot.id, data)}
                  onDelete={() => onDeleteSubLot(row.lot.id, row.sublot.id)}
                  isReadOnly={isReadOnly}
                />
              )
            }
            if (row.kind === 'post') {
              return (
                <PostRow
                  key={row.post.id}
                  post={row.post}
                  sublot={row.sublot}
                  lotName={row.lot.name}
                  isReadOnly={isReadOnly}
                  onUpdate={(data) => onUpdatePost(row.lot.id, row.post.id, data)}
                  onDelete={() => onDeletePost(row.lot.id, row.post.id)}
                  onSaveToLibrary={(data) => onSaveToLibrary(row.lot.id, row.post.id, data)}
                />
              )
            }
            if (row.kind === 'add-sublot') {
              return (
                <AddSubLotRow
                  key={`add-sublot-${row.lot.id}`}
                  lot={row.lot}
                  onAdd={onAddSubLot}
                />
              )
            }
            if (row.kind === 'add-post') {
              return (
                <AddPostRow
                  key={`add-post-${row.lot.id}-${row.sublot?.id ?? 'direct'}`}
                  lot={row.lot}
                  sublot={row.sublot}
                  onAdd={onAddPost}
                />
              )
            }
            // add-lot
            return <AddLotRow key="add-lot" onAdd={onAddLot} />
          })}
        </SortableContext>

        <DragOverlay>
          {activeLot && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded shadow-lg"
              style={{ background: 'var(--green)', color: '#FFFFFF', opacity: 0.95 }}
            >
              <GripVertical className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
              <span
                className="px-2 py-0.5 rounded text-xs font-bold text-white"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                {activeLot.number}
              </span>
              <span className="text-sm font-medium">{activeLot.name}</span>
            </div>
          )}
          {activeSublot && (
            <div
              className="flex items-center gap-2 px-4 py-2 rounded shadow-lg"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', opacity: 0.95 }}
            >
              <GripVertical className="w-3.5 h-3.5" style={{ color: 'var(--text3)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--green-mid)' }}>
                {activeSublot.number}
              </span>
              <span className="text-sm" style={{ color: 'var(--text)' }}>{activeSublot.name}</span>
            </div>
          )}
          {activePost && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded shadow-lg bg-white"
              style={{ border: '1px solid var(--border)', opacity: 0.95 }}
            >
              <GripVertical className="w-3.5 h-3.5" style={{ color: 'var(--text3)' }} />
              <span className="text-xs font-mono" style={{ color: 'var(--text3)' }}>{activePost.ref}</span>
              <span className="text-sm truncate" style={{ color: 'var(--text)' }}>{activePost.title || '—'}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
