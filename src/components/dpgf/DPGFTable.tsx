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
const COLS = '128px 1fr 96px 96px 116px 116px 44px'

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
        background: '#2B2B28',
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
          className="flex-1 bg-transparent outline-none text-sm font-medium border-b"
          style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.3)' }}
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
          className={`flex-1 text-sm font-medium ${isReadOnly ? '' : 'cursor-text'}`}
          onDoubleClick={() => { if (!isReadOnly) setEditName(lot.name) }}
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
  const [editState, setEditState] = useState<{ number: string; name: string } | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const depth = (sublot.number.match(/\./g) ?? []).length
  const paddingLeft = 20 + depth * 16

  async function commitEdit() {
    if (!editState) return
    const number = editState.number.trim()
    const name = editState.name.trim()
    if (number && name && (number !== sublot.number || name !== sublot.name)) {
      await onUpdate({ number, name })
    }
    setEditState(null)
  }

  return (
    <div
      className="flex items-center gap-2 pr-3 py-2 border-b"
      style={{
        paddingLeft: `${paddingLeft}px`,
        background: 'var(--surface2)',
        borderColor: 'var(--border)',
        color: 'var(--text)',
      }}
    >
      {editState !== null ? (
        <input
          autoFocus
          className="w-16 text-sm font-bold border-b outline-none bg-transparent shrink-0"
          style={{ color: 'var(--green-mid)', borderColor: 'var(--border2)' }}
          value={editState.number}
          onChange={(e) => setEditState((s) => s && { ...s, number: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault()
              nameInputRef.current?.focus()
            }
            if (e.key === 'Escape') setEditState(null)
          }}
        />
      ) : (
        <span
          className={`text-sm font-bold shrink-0 ${isReadOnly ? '' : 'cursor-text'}`}
          style={{ color: 'var(--green-mid)' }}
          onDoubleClick={() => { if (!isReadOnly) setEditState({ number: sublot.number, name: sublot.name }) }}
        >
          {lot.number}.{sublot.number}
        </span>
      )}

      {editState !== null ? (
        <input
          ref={nameInputRef}
          className="flex-1 text-sm font-semibold border-b outline-none bg-transparent"
          style={{ borderColor: 'var(--border2)', color: 'var(--text)' }}
          value={editState.name}
          onChange={(e) => setEditState((s) => s && { ...s, name: e.target.value })}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit()
            if (e.key === 'Escape') setEditState(null)
          }}
        />
      ) : (
        <span
          className={`flex-1 text-sm font-semibold ${isReadOnly ? '' : 'cursor-text'}`}
          onDoubleClick={() => { if (!isReadOnly) setEditState({ number: sublot.number, name: sublot.name }) }}
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

// ── PostRow ────────────────────────────────────────────────────────────────────
interface PostRowProps {
  post: Post
  sublot?: SubLotWithPosts
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

function PostRow({ post, sublot, isReadOnly, onUpdate, onDelete, onSaveToLibrary }: PostRowProps) {
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

  async function commitEdit(field: string, raw: string) {
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
    setEditField(null)
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

  const indentPx = sublot ? 40 : 24

  return (
    <div
      className="grid items-center border-b bg-white hover:bg-neutral-50 transition-colors group"
      style={{ gridTemplateColumns: COLS, borderColor: 'var(--border)' }}
    >
      {/* Réf */}
      <div
        className="flex items-center gap-1.5 py-2 text-xs font-mono"
        style={{ paddingLeft: `${indentPx}px`, paddingRight: '8px', color: 'var(--text3)' }}
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
      <div className="px-2 py-2 flex items-center gap-2 min-w-0">
        {editField === 'title' ? (
          <input
            autoFocus
            className="w-full text-sm outline-none rounded"
            style={{ border: '1px solid var(--border)', padding: '4px 8px', color: 'var(--text)', background: 'var(--surface)' }}
            defaultValue={localPost.title}
            onBlur={(e) => commitEdit('title', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit('title', e.currentTarget.value)
              if (e.key === 'Escape') setEditField(null)
            }}
          />
        ) : (
          <span
            className={`text-sm truncate flex-1 ${isReadOnly ? '' : 'cursor-text'}`}
            style={{ color: localPost.title ? 'var(--text)' : 'var(--text3)' }}
            onClick={() => { if (!isReadOnly) setEditField('title') }}
          >
            {localPost.title || 'Désignation…'}
          </span>
        )}
        {localPost.isOptional && (
          <span
            className="text-xs px-1.5 py-0.5 rounded shrink-0 font-medium"
            style={{ background: '#EDE9FE', color: '#6D28D9' }}
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
            className="w-full text-sm outline-none rounded"
            style={{ border: '1px solid var(--border)', padding: '4px 6px', color: 'var(--text)', background: 'var(--surface)' }}
          >
            {!UNITS.includes(localPost.unit) && <option value="">{localPost.unit}</option>}
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        )}
      </div>

      {/* Quantité */}
      <div className="px-2 py-2">
        {editField === 'qtyArchi' ? (
          <input
            autoFocus
            className="w-full text-sm text-right outline-none rounded"
            style={{ border: '1px solid var(--border)', padding: '4px 8px', color: 'var(--text)', background: 'var(--surface)' }}
            defaultValue={localPost.qtyArchi?.toString() ?? ''}
            onBlur={(e) => commitEdit('qtyArchi', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit('qtyArchi', e.currentTarget.value)
              if (e.key === 'Escape') setEditField(null)
            }}
          />
        ) : (
          <span
            className={`text-sm text-right block ${isReadOnly ? '' : 'cursor-text'}`}
            style={{ color: localPost.qtyArchi == null ? 'var(--amber)' : 'var(--text2)' }}
            onClick={() => { if (!isReadOnly) setEditField('qtyArchi') }}
          >
            {localPost.qtyArchi != null ? localPost.qtyArchi.toLocaleString('fr-FR') : '—'}
          </span>
        )}
      </div>

      {/* Prix U. */}
      <div className="px-2 py-2">
        {editField === 'unitPriceArchi' ? (
          <input
            autoFocus
            className="w-full text-sm text-right outline-none rounded"
            style={{ border: '1px solid var(--border)', padding: '4px 8px', color: 'var(--text)', background: 'var(--surface)' }}
            defaultValue={localPost.unitPriceArchi?.toString() ?? ''}
            onBlur={(e) => commitEdit('unitPriceArchi', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit('unitPriceArchi', e.currentTarget.value)
              if (e.key === 'Escape') setEditField(null)
            }}
          />
        ) : (
          <span
            className={`text-sm text-right block ${isReadOnly ? '' : 'cursor-text'}`}
            style={{
              color: localPost.unitPriceArchi == null ? 'var(--amber)' : 'var(--text2)',
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
            style={{ color: post.isOptional ? '#6D28D9' : 'var(--text)' }}
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
  const indentPx = sublot ? 40 : 24

  if (!adding) {
    return (
      <div
        className="flex items-center gap-1.5 py-1.5 border-b cursor-pointer text-xs hover:bg-neutral-50 transition-colors"
        style={{ paddingLeft: `${indentPx}px`, borderColor: 'var(--border)', color: 'var(--text3)' }}
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
      <div style={{ paddingLeft: `${indentPx}px` }} />
      <div className="px-2 py-1.5">
        <input
          autoFocus
          className="w-full text-sm border-b outline-none bg-transparent"
          style={{ borderColor: 'var(--green-mid)', color: 'var(--text)' }}
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
          className="w-full text-sm outline-none rounded"
          style={{ border: '1px solid var(--green-mid)', padding: '4px 6px', color: 'var(--text)', background: 'var(--surface)' }}
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
  const [number, setNumber] = useState('')
  const [name, setName] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

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

  async function commit() {
    if (number.trim() && name.trim()) {
      await onAdd(lot.id, { number: number.trim(), name: name.trim() })
      setNumber('')
      setName('')
      setAdding(false)
    }
  }

  return (
    <div
      className="flex items-center gap-2 px-5 py-1.5 border-b"
      style={{ borderColor: 'var(--border)', background: 'var(--green-light)' }}
    >
      <input
        autoFocus
        className="w-16 text-sm font-bold border-b outline-none bg-transparent shrink-0"
        style={{ color: 'var(--green-mid)', borderColor: 'var(--green-mid)' }}
        placeholder="N°"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Tab') { e.preventDefault(); nameInputRef.current?.focus() }
          if (e.key === 'Escape') setAdding(false)
        }}
      />
      <input
        ref={nameInputRef}
        className="flex-1 text-sm font-semibold border-b outline-none bg-transparent"
        style={{ borderColor: 'var(--green-mid)', color: 'var(--text)' }}
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
function AddLotRow({ onAdd }: { onAdd: (name: string) => Promise<void> }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

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

  return (
    <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: '#2B2B28' }}>
      <span
        className="px-2 py-0.5 rounded text-xs font-bold text-white shrink-0"
        style={{ background: 'var(--green)', opacity: 0.5 }}
      >
        ?
      </span>
      <input
        autoFocus
        className="flex-1 text-sm font-medium bg-transparent outline-none border-b"
        style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.3)' }}
        placeholder="Nom du lot…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={async () => {
          if (name.trim()) await onAdd(name.trim())
          setName('')
          setAdding(false)
        }}
        onKeyDown={async (e) => {
          if (e.key === 'Enter' && name.trim()) {
            await onAdd(name.trim())
            setName('')
            setAdding(false)
          }
          if (e.key === 'Escape') { setName(''); setAdding(false) }
        }}
      />
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
}: DPGFTableProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

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
    setActiveDragId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null)
    if (isReadOnly) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = lots.findIndex((l) => l.id === active.id)
    const newIndex = lots.findIndex((l) => l.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(lots, oldIndex, newIndex)
    await onReorderLots(reordered.map((l, i) => ({ lotId: l.id, position: i })))
  }

  const activeLot = activeDragId ? lots.find((l) => l.id === activeDragId) : null

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
        <SortableContext items={lots.map((l) => l.id)} strategy={verticalListSortingStrategy}>
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
              style={{ background: '#2B2B28', color: '#FFFFFF', opacity: 0.9 }}
            >
              <GripVertical className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
              <span
                className="px-2 py-0.5 rounded text-xs font-bold text-white"
                style={{ background: 'var(--green)' }}
              >
                {activeLot.number}
              </span>
              <span className="text-sm font-medium">{activeLot.name}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
