'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { BookOpen, Upload, CheckCheck, Trash2, Check, X, ChevronLeft, ChevronRight, FileSpreadsheet, AlertTriangle } from 'lucide-react'

interface LibraryItem {
  id: string
  lot: string
  sousLot: string | null
  intitule: string
  unite: string | null
  source: string | null
  validated: boolean
  usageCount: number
  createdAt: string
}

interface EditableCandidate {
  key: number
  lot: string
  sousLot: string
  intitule: string
  unite: string
}

// Lots DPGF conventionnels (référentiel français)
const STANDARD_LOTS = [
  'Démolition / Dépose',
  'Gros œuvre / Maçonnerie',
  'Charpente bois',
  'Charpente métallique',
  'Couverture / Zinguerie',
  'Étanchéité',
  'Façades / Ravalement',
  'Isolation thermique par l\'extérieur (ITE)',
  'Menuiseries extérieures / Vitrerie',
  'Menuiseries intérieures / Agencement',
  'Cloisons / Plâtrerie / Faux-plafonds',
  'Isolation thermique / Acoustique',
  'Carrelage / Faïence',
  'Revêtements de sols souples',
  'Parquet',
  'Peinture / Finitions',
  'Serrurerie / Métallerie',
  'Plomberie / Sanitaires',
  'Chauffage / Ventilation / Climatisation (CVC)',
  'Électricité courants forts',
  'Courants faibles / Domotique',
  'VRD / Terrassement',
  'Espaces verts / Paysagisme',
  'Cuisines / Mobilier',
  'Ascenseur / Élévateur',
  'Divers / Nettoyage',
]

// Unités de mesure valides
const VALID_UNITS = new Set([
  'm', 'm2', 'm²', 'm3', 'm³', 'ml', 'ml.', 'ml ', 'ml²',
  'u', 'ens', 'ens.', 'forfait', 'lot', 'pm', '%',
  'kg', 't', 'h', 'j', 'nb', 'p', 'pce',
  'l', 'cm', 'mm', 'ha', 'dm', 'dm2', 'dm3',
])

function isUnitValid(u: string): boolean {
  if (!u.trim()) return true // vide = ok (pas d'unité)
  const v = u.trim().toLowerCase().replace(/\s+/g, '')
  if (/^\d+([.,]\d+)?$/.test(v)) return false // nombre pur : invalide
  if (/^\d/.test(v)) return false // commence par un chiffre : invalide
  return true
}

const PAGE_SIZE = 50

export default function AdminBibliothequePage() {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [total, setTotal] = useState(0)
  const [lots, setLots] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  // Filters
  const [filterLot, setFilterLot] = useState('')
  const [filterValidated, setFilterValidated] = useState<'' | 'true' | 'false'>('')

  // Import dialog
  const [importOpen, setImportOpen] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [candidates, setCandidates] = useState<EditableCandidate[]>([])
  const [parseError, setParseError] = useState('')
  const [importFileName, setImportFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; duplicates: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Preview controls
  const [previewLotFilter, setPreviewLotFilter] = useState('')
  const [showInvalidOnly, setShowInvalidOnly] = useState(false)
  const [sortLot, setSortLot] = useState(false)

  // Validate-all loading
  const [validatingAll, setValidatingAll] = useState(false)

  const load = useCallback(async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p) })
    if (filterLot) params.set('lot', filterLot)
    if (filterValidated) params.set('validated', filterValidated)
    const res = await fetch(`/api/admin/library?${params}`)
    if (res.ok) {
      const data = await res.json()
      setItems(data.items)
      setTotal(data.total)
      setLots(data.lots)
    }
    setLoading(false)
  }, [page, filterLot, filterValidated])

  useEffect(() => { void load() }, [load])

  function resetFilters() {
    setFilterLot('')
    setFilterValidated('')
    setPage(1)
  }

  async function toggleValidate(item: LibraryItem) {
    setActionId(item.id)
    const res = await fetch(`/api/admin/library/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ validated: !item.validated }),
    })
    if (res.ok) {
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, validated: !i.validated } : i))
    }
    setActionId(null)
  }

  async function deleteItem(item: LibraryItem) {
    if (!confirm(`Supprimer "${item.intitule}" ?`)) return
    setActionId(item.id)
    const res = await fetch(`/api/admin/library/${item.id}`, { method: 'DELETE' })
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== item.id))
    setActionId(null)
  }

  async function validateAll() {
    if (!confirm('Valider tous les postes en attente ?')) return
    setValidatingAll(true)
    const res = await fetch('/api/admin/library/validate-all', { method: 'PATCH' })
    if (res.ok) {
      await load(page)
    }
    setValidatingAll(false)
  }

  // ── Import dialog ─────────────────────────────────────────────────────────

  async function handleFile(file: File) {
    setParsing(true)
    setParseError('')
    setCandidates([])
    setImportResult(null)
    setImportFileName(file.name)

    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
        header: 1,
        defval: null,
      }) as (string | number | null)[][]

      const norm = (s: string) =>
        s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

      // Match exact word or start of cell — évite de matcher "total" pour "lot"
      const findCol = (headers: (string | number | null)[], kws: string[]) => {
        for (let i = 0; i < headers.length; i++) {
          const h = norm(String(headers[i] ?? ''))
          if (kws.some((k) => h === k || h.startsWith(k + ' ') || h.startsWith(k + '/') || h.startsWith(k + '_') || h === k + 's')) return i
        }
        return -1
      }

      // Match partiel pour les colonnes intitulé/unité où on accepte plus de variantes
      const findColLoose = (headers: (string | number | null)[], kws: string[]) => {
        for (let i = 0; i < headers.length; i++) {
          const h = norm(String(headers[i] ?? ''))
          if (kws.some((k) => h.includes(k))) return i
        }
        return -1
      }

      let headerRowIdx = -1
      let lotIdx = -1, sousLotIdx = -1, intituleIdx = -1, uniteIdx = -1

      // Cherche la ligne d'en-tête sur les 20 premières lignes
      for (let i = 0; i < Math.min(20, rows.length); i++) {
        const row = rows[i].map((c) => String(c ?? ''))
        const ti = findColLoose(row, ['intitule', 'designation', 'libelle', 'description', 'prestation', 'nature des travaux', 'nature travaux', 'article', 'ouvrage'])
        if (ti !== -1) {
          headerRowIdx = i
          intituleIdx = ti
          // Lot : correspondance stricte pour éviter "total", "sous-total"
          lotIdx = findCol(row, ['lot', 'corps d\'etat', 'corps etat', 'categorie'])
          sousLotIdx = findCol(row, ['sous-lot', 'sous lot', 'sous_lot', 'section', 'chapitre'])
          if (sousLotIdx === -1) sousLotIdx = findColLoose(row, ['sous-lot', 'sous lot', 'sous_lot'])
          uniteIdx = findColLoose(row, ['unite', 'u.', 'unite de mesure', 'um'])
          // Fallback unité : colonne nommée exactement "u" ou "u "
          if (uniteIdx === -1) {
            for (let j = 0; j < row.length; j++) {
              if (norm(row[j]) === 'u' || norm(row[j]) === 'unité') { uniteIdx = j; break }
            }
          }
          break
        }
      }

      // Si pas d'en-tête trouvé, on tente quand même avec la première colonne non vide comme intitulé
      if (intituleIdx === -1) {
        // Cherche la première ligne avec plus de 2 cellules non vides
        for (let i = 0; i < Math.min(20, rows.length); i++) {
          const nonEmpty = rows[i].filter((c) => String(c ?? '').trim().length > 0)
          if (nonEmpty.length >= 2) {
            headerRowIdx = i
            intituleIdx = 0 // première colonne par défaut
            break
          }
        }
      }

      if (intituleIdx === -1) {
        setParseError("Impossible de détecter la structure du fichier. Vérifiez qu'il contient des données tabulaires avec au moins une colonne de désignation.")
        setParsing(false)
        return
      }

      const result: { lot: string; sousLot?: string; intitule: string; unite?: string }[] = []
      let currentLot = ''
      let currentSousLot = ''

      const dataStart = headerRowIdx >= 0 ? headerRowIdx + 1 : 0

      for (let i = dataStart; i < rows.length; i++) {
        const row = rows[i].map((c) => String(c ?? '').trim())

        // ── Détection du lot depuis une colonne dédiée ──
        if (lotIdx >= 0 && row[lotIdx] && row[lotIdx].length > 1) {
          currentLot = row[lotIdx]
          currentSousLot = ''
        }

        if (sousLotIdx >= 0 && row[sousLotIdx] && row[sousLotIdx].length > 1) {
          currentSousLot = row[sousLotIdx]
        }

        const intituleVal = row[intituleIdx] ?? ''
        const uniteVal = uniteIdx >= 0 ? (row[uniteIdx] ?? '') : ''

        // ── Détection du lot depuis une ligne-titre (pas de colonne lot) ──
        // Une ligne est un en-tête de lot si : l'intitulé est vide OU
        // la ligne n'a qu'une cellule non vide qui n'est pas une unité courante
        if (lotIdx === -1) {
          const nonEmptyCells = row.filter((c) => c.length > 0)
          const UNITS = ['m²', 'm2', 'm³', 'm3', 'ml', 'u', 'kg', 't', 'h', 'j', 'ens', 'lot', 'pm', 'forfait']
          const looksLikeUnit = (s: string) => UNITS.includes(norm(s))
          if (
            nonEmptyCells.length <= 2 &&
            nonEmptyCells.length > 0 &&
            !looksLikeUnit(nonEmptyCells[0]) &&
            nonEmptyCells[0].length > 3
          ) {
            currentLot = nonEmptyCells[0]
            currentSousLot = ''
            continue
          }
        }

        if (!intituleVal || intituleVal.length < 3) continue

        // Si toujours pas de lot, on utilise "Non catégorisé"
        if (!currentLot) currentLot = 'Non catégorisé'

        result.push({
          lot: currentLot,
          sousLot: currentSousLot || undefined,
          intitule: intituleVal,
          unite: uniteVal || undefined,
        })
      }

      if (result.length === 0) {
        setParseError(
          `Aucun poste extrait. Structure détectée : colonne intitulé = ${intituleIdx >= 0 ? `col. ${intituleIdx + 1}` : 'non trouvée'}, colonne lot = ${lotIdx >= 0 ? `col. ${lotIdx + 1}` : 'non trouvée (détection par ligne)'}, ${rows.length} lignes lues. Vérifiez que le fichier contient bien des postes avec des libellés.`
        )
      } else {
        setCandidates(result.map((r, i) => ({
          key: i,
          lot: r.lot,
          sousLot: r.sousLot ?? '',
          intitule: r.intitule,
          unite: r.unite ?? '',
        })))
        setPreviewLotFilter('')
        setShowInvalidOnly(false)
        setSortLot(false)
      }
    } catch {
      setParseError('Erreur lors de la lecture du fichier.')
    }

    setParsing(false)
  }

  function updateCandidate(key: number, patch: Partial<EditableCandidate>) {
    setCandidates((prev) => prev.map((c) => c.key === key ? { ...c, ...patch } : c))
  }

  function removeCandidate(key: number) {
    setCandidates((prev) => prev.filter((c) => c.key !== key))
  }

  async function confirmImport() {
    setImporting(true)
    const res = await fetch('/api/admin/library/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: candidates.map((c) => ({
          lot: c.lot,
          sousLot: c.sousLot || undefined,
          intitule: c.intitule,
          unite: c.unite || undefined,
        })),
        source: importFileName,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setImportResult(data)
      setCandidates([])
      await load(1)
      setPage(1)
    }
    setImporting(false)
  }

  function closeImport() {
    setImportOpen(false)
    setCandidates([])
    setParseError('')
    setImportResult(null)
    setImportFileName('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const pendingCount = items.filter((i) => !i.validated).length
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Preview derived data
  const previewLots = useMemo(() => Array.from(new Set(candidates.map((c) => c.lot))).sort(), [candidates])
  const invalidCount = useMemo(() => candidates.filter((c) => !isUnitValid(c.unite)).length, [candidates])
  const previewFiltered = useMemo(() => {
    let list = candidates
    if (previewLotFilter) list = list.filter((c) => c.lot === previewLotFilter)
    if (showInvalidOnly) list = list.filter((c) => !isUnitValid(c.unite))
    if (sortLot) list = [...list].sort((a, b) => a.lot.localeCompare(b.lot, 'fr'))
    return list
  }, [candidates, previewLotFilter, showInvalidOnly, sortLot])

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: '#EAF3ED', color: '#1A5C3A' }}>
            <BookOpen size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1A1A18' }}>Bibliothèque DPGF</h1>
            <p className="text-sm" style={{ color: '#6B6B65' }}>{total} intitulé{total > 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {pendingCount > 0 && (
            <button
              onClick={validateAll}
              disabled={validatingAll}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-50"
              style={{ background: '#EAF3ED', color: '#1A5C3A', border: '1px solid #C6DFD0' }}
            >
              <CheckCheck size={15} />
              Valider tout ({pendingCount})
            </button>
          )}
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium"
            style={{ background: '#1A5C3A', color: '#fff' }}
          >
            <Upload size={15} />
            Importer une DPGF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          list="filter-lots-datalist"
          value={filterLot}
          onChange={(e) => { setFilterLot(e.target.value); setPage(1) }}
          placeholder="Filtrer par lot…"
          className="text-sm rounded-lg px-3 py-2 outline-none"
          style={{ border: '1px solid #E8E8E3', background: '#fff', color: '#1A1A18', width: 220 }}
        />
        <datalist id="filter-lots-datalist">
          {lots.map((l) => <option key={l} value={l} />)}
        </datalist>
        <select
          value={filterValidated}
          onChange={(e) => { setFilterValidated(e.target.value as '' | 'true' | 'false'); setPage(1) }}
          className="text-sm rounded-lg px-3 py-2 outline-none"
          style={{ border: '1px solid #E8E8E3', background: '#fff', color: '#1A1A18' }}
        >
          <option value="">Tous les statuts</option>
          <option value="true">Validés</option>
          <option value="false">En attente</option>
        </select>
        {(filterLot || filterValidated) && (
          <button
            onClick={resetFilters}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ color: '#6B6B65', background: '#F3F4F6', border: '1px solid #E8E8E3' }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-[14px] overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E8E3', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {loading ? (
          <div className="px-6 py-12 text-center text-sm" style={{ color: '#9B9B94' }}>Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #E8E8E3', background: '#FAFAF8' }}>
                  {['Lot', 'Sous-lot', 'Intitulé', 'Unité', 'Source', 'Utilisations', 'Statut', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-xs" style={{ color: '#6B6B65' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr
                    key={item.id}
                    style={{ borderBottom: i < items.length - 1 ? '1px solid #E8E8E3' : undefined, opacity: actionId === item.id ? 0.5 : 1 }}
                  >
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: '#EAF3ED', color: '#1A5C3A' }}>
                        {item.lot}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: '#6B6B65' }}>{item.sousLot ?? '—'}</td>
                    <td className="px-4 py-2.5 font-medium" style={{ color: '#1A1A18', maxWidth: 320 }}>
                      <span className="line-clamp-2">{item.intitule}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono" style={{ color: '#6B6B65' }}>{item.unite ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: '#9B9B94' }}>{item.source ?? '—'}</td>
                    <td className="px-4 py-2.5 tabular-nums text-xs" style={{ color: '#6B6B65' }}>{item.usageCount}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={item.validated
                          ? { background: '#EAF3ED', color: '#1A5C3A' }
                          : { background: '#FEF3E2', color: '#B45309' }
                        }
                      >
                        {item.validated ? 'Validé' : 'En attente'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          title={item.validated ? 'Invalider' : 'Valider'}
                          onClick={() => toggleValidate(item)}
                          disabled={actionId !== null}
                          className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
                          style={{
                            background: item.validated ? '#F3F4F6' : '#EAF3ED',
                            color: item.validated ? '#6B7280' : '#1A5C3A',
                          }}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          title="Supprimer"
                          onClick={() => deleteItem(item)}
                          disabled={actionId !== null}
                          className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
                          style={{ background: '#FEE8E8', color: '#9B1C1C' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-sm" style={{ color: '#9B9B94' }}>
                      Aucun intitulé{filterLot || filterValidated ? ' pour ces filtres' : ''}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid #E8E8E3' }}>
            <span className="text-xs" style={{ color: '#9B9B94' }}>
              Page {page} / {totalPages} · {total} résultat{total > 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => { const p = page - 1; setPage(p); void load(p) }}
                disabled={page === 1}
                className="p-1.5 rounded-lg disabled:opacity-30"
                style={{ background: '#F3F4F6', color: '#6B6B65' }}
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => { const p = page + 1; setPage(p); void load(p) }}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg disabled:opacity-30"
                style={{ background: '#F3F4F6', color: '#6B6B65' }}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Import Dialog */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-4xl mx-4 rounded-[16px] overflow-hidden flex flex-col" style={{ background: '#fff', border: '1px solid #E8E8E3', maxHeight: '92vh' }}>

            {/* Dialog Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #E8E8E3' }}>
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet size={18} style={{ color: '#1A5C3A' }} />
                <h2 className="text-base font-semibold" style={{ color: '#1A1A18' }}>Importer une DPGF Excel</h2>
              </div>
              <button onClick={closeImport} className="p-1 rounded" style={{ color: '#9B9B94' }}>
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Success state */}
              {importResult && (
                <div className="rounded-xl p-4 text-sm" style={{ background: '#EAF3ED', color: '#1A5C3A', border: '1px solid #C6DFD0' }}>
                  <div className="font-semibold mb-1">Import terminé</div>
                  <div>{importResult.imported} poste{importResult.imported > 1 ? 's' : ''} importé{importResult.imported > 1 ? 's' : ''}</div>
                  {importResult.duplicates > 0 && (
                    <div className="text-xs mt-0.5" style={{ color: '#2D7A50' }}>{importResult.duplicates} doublon{importResult.duplicates > 1 ? 's' : ''} ignoré{importResult.duplicates > 1 ? 's' : ''}</div>
                  )}
                </div>
              )}

              {/* File upload zone */}
              {!importResult && (
                <>
                  <div
                    className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors"
                    style={{ borderColor: '#D4D4CC', background: '#FAFAF8' }}
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      const file = e.dataTransfer.files[0]
                      if (file) void handleFile(file)
                    }}
                  >
                    <Upload size={24} className="mx-auto mb-2" style={{ color: '#9B9B94' }} />
                    <p className="text-sm font-medium" style={{ color: '#1A1A18' }}>
                      Déposez votre DPGF Excel ici
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#9B9B94' }}>ou cliquez pour sélectionner (.xlsx, .xls)</p>
                    {importFileName && (
                      <p className="text-xs mt-2 font-medium" style={{ color: '#1A5C3A' }}>{importFileName}</p>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) void handleFile(file)
                      }}
                    />
                  </div>

                  {parsing && (
                    <div className="text-sm text-center py-2" style={{ color: '#9B9B94' }}>Analyse en cours...</div>
                  )}

                  {parseError && (
                    <div className="rounded-xl p-3 text-sm" style={{ background: '#FEE8E8', color: '#9B1C1C', border: '1px solid #FCA5A5' }}>
                      {parseError}
                    </div>
                  )}

                  {/* Preview éditable */}
                  {candidates.length > 0 && (
                    <div className="space-y-3">

                      {/* Stats + alerte unités invalides */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="text-sm font-medium" style={{ color: '#1A1A18' }}>
                          {candidates.length} poste{candidates.length > 1 ? 's' : ''} · {previewLots.length} lot{previewLots.length > 1 ? 's' : ''}
                        </p>
                        {invalidCount > 0 && (
                          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#FEF3E2', color: '#B45309' }}>
                            <AlertTriangle size={12} />
                            {invalidCount} unité{invalidCount > 1 ? 's' : ''} invalide{invalidCount > 1 ? 's' : ''} (chiffres)
                          </span>
                        )}
                      </div>

                      {/* Filtres preview */}
                      <div className="flex flex-wrap gap-2">
                        <select
                          value={previewLotFilter}
                          onChange={(e) => setPreviewLotFilter(e.target.value)}
                          className="text-xs rounded-lg px-2.5 py-1.5 outline-none"
                          style={{ border: '1px solid #E8E8E3', background: '#fff', color: '#1A1A18' }}
                        >
                          <option value="">Tous les lots ({candidates.length})</option>
                          {previewLots.map((l) => (
                            <option key={l} value={l}>{l} ({candidates.filter((c) => c.lot === l).length})</option>
                          ))}
                        </select>
                        <button
                          onClick={() => setShowInvalidOnly((v) => !v)}
                          className="text-xs px-2.5 py-1.5 rounded-lg font-medium"
                          style={showInvalidOnly
                            ? { background: '#FEF3E2', color: '#B45309', border: '1px solid #FCD34D' }
                            : { background: '#F3F4F6', color: '#6B6B65', border: '1px solid #E8E8E3' }
                          }
                        >
                          {showInvalidOnly ? '✕ ' : ''}Unités invalides seulement
                        </button>
                        <button
                          onClick={() => setSortLot((v) => !v)}
                          className="text-xs px-2.5 py-1.5 rounded-lg"
                          style={sortLot
                            ? { background: '#EEF2FF', color: '#4338CA', border: '1px solid #C7D2FE' }
                            : { background: '#F3F4F6', color: '#6B6B65', border: '1px solid #E8E8E3' }
                          }
                        >
                          Trier par lot
                        </button>
                      </div>

                      {/* Datalist lots (standard + détectés dans le fichier) */}
                      <datalist id="lots-datalist">
                        {STANDARD_LOTS.map((l) => <option key={l} value={l} />)}
                        {previewLots.filter((l) => !STANDARD_LOTS.includes(l)).map((l) => (
                          <option key={l} value={l} />
                        ))}
                      </datalist>

                      {/* Table éditable */}
                      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E8E8E3', maxHeight: 380, overflowY: 'auto' }}>
                        <table className="w-full text-xs">
                          <thead style={{ position: 'sticky', top: 0, background: '#FAFAF8', borderBottom: '1px solid #E8E8E3', zIndex: 1 }}>
                            <tr>
                              <th className="text-left px-3 py-2 font-medium" style={{ color: '#6B6B65', width: 160 }}>Lot</th>
                              <th className="text-left px-3 py-2 font-medium" style={{ color: '#6B6B65' }}>Intitulé</th>
                              <th className="text-left px-3 py-2 font-medium" style={{ color: '#6B6B65', width: 80 }}>Unité</th>
                              <th style={{ width: 32 }} />
                            </tr>
                          </thead>
                          <tbody>
                            {previewFiltered.map((c) => {
                              const unitInvalid = !isUnitValid(c.unite)
                              return (
                                <tr key={c.key} style={{ borderBottom: '1px solid #F3F3F0', background: unitInvalid ? '#FFFBEB' : undefined }}>
                                  {/* Lot — datalist (liste standard + lots fichier + saisie libre) */}
                                  <td className="px-2 py-1">
                                    <input
                                      list="lots-datalist"
                                      value={c.lot}
                                      onChange={(e) => updateCandidate(c.key, { lot: e.target.value })}
                                      className="w-full text-xs rounded px-1.5 py-0.5 outline-none"
                                      style={{ border: '1px solid #C6DFD0', background: '#EAF3ED', color: '#1A5C3A', maxWidth: 150 }}
                                    />
                                  </td>
                                  {/* Intitulé */}
                                  <td className="px-3 py-1 font-medium" style={{ color: '#1A1A18' }}>
                                    <span className="line-clamp-1">{c.intitule}</span>
                                  </td>
                                  {/* Unité — input avec validation */}
                                  <td className="px-2 py-1">
                                    <input
                                      value={c.unite}
                                      onChange={(e) => updateCandidate(c.key, { unite: e.target.value })}
                                      className="w-full text-xs rounded px-1.5 py-0.5 outline-none font-mono"
                                      style={{
                                        border: `1px solid ${unitInvalid ? '#FCD34D' : '#E8E8E3'}`,
                                        background: unitInvalid ? '#FEF3E2' : '#F8F8F6',
                                        color: unitInvalid ? '#B45309' : '#1A1A18',
                                      }}
                                      title={unitInvalid ? 'Unité invalide — doit être une unité de mesure (m², ml, u, kg…)' : ''}
                                    />
                                  </td>
                                  {/* Supprimer */}
                                  <td className="px-1 py-1">
                                    <button
                                      onClick={() => removeCandidate(c.key)}
                                      className="p-1 rounded opacity-40 hover:opacity-100 transition-opacity"
                                      style={{ color: '#9B1C1C' }}
                                      title="Supprimer ce poste"
                                    >
                                      <X size={12} />
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                            {previewFiltered.length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-3 py-6 text-center" style={{ color: '#9B9B94' }}>
                                  Aucun poste pour ces filtres
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Dialog Footer */}
            <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid #E8E8E3' }}>
              <button
                onClick={closeImport}
                className="text-sm px-4 py-2 rounded-lg"
                style={{ background: '#F3F4F6', color: '#6B6B65', border: '1px solid #E8E8E3' }}
              >
                {importResult ? 'Fermer' : 'Annuler'}
              </button>
              {!importResult && candidates.length > 0 && (
                <div className="flex items-center gap-3">
                  {invalidCount > 0 && (
                    <span className="text-xs" style={{ color: '#B45309' }}>
                      {invalidCount} unité{invalidCount > 1 ? 's' : ''} invalide{invalidCount > 1 ? 's' : ''} — corrigez ou laissez vide
                    </span>
                  )}
                  <button
                    onClick={confirmImport}
                    disabled={importing}
                    className="text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                    style={{ background: '#1A5C3A', color: '#fff' }}
                  >
                    {importing ? 'Import...' : `Importer ${candidates.length} poste${candidates.length > 1 ? 's' : ''}`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
