import * as XLSX from 'xlsx'
import type { ImportedLot, ImportedSubLot, ImportedPost, AIImportResult } from './ai-import'

// ─── Types internes ────────────────────────────────────────────────────────────

export interface ColumnMapping {
  ref: number | null       // colonne index pour la référence / numéro
  title: number | null     // colonne index pour la désignation
  unit: number | null      // colonne index pour l'unité
  qty: number | null       // colonne index pour la quantité
  unitPrice: number | null // colonne index pour le prix unitaire
}

export interface ParsePreview {
  headers: string[]
  rows: (string | number | null)[][]
  detected: ColumnMapping
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\s/g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}

function toStr(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

/** Détecter le niveau hiérarchique d'une référence */
function refLevel(ref: string): 0 | 1 | 2 | 3 {
  const clean = ref.trim()
  // Numérotation type "1", "01" → LOT
  if (/^\d{1,3}$/.test(clean)) return 1
  // "1.2" ou "01.02" → SOUS-LOT
  if (/^\d{1,3}\.\d{1,3}$/.test(clean)) return 2
  // "1.2.3" ou "01.02.03" → POSTE
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}/.test(clean)) return 3
  return 0
}

/** Heuristiques pour détecter les colonnes depuis les headers */
function detectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = { ref: null, title: null, unit: null, qty: null, unitPrice: null }

  const norm = headers.map((h) => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))

  for (let i = 0; i < norm.length; i++) {
    const h = norm[i]
    if (mapping.ref === null && (h.includes('ref') || h.includes('num') || h === 'n°' || h === 'no' || h === 'art')) {
      mapping.ref = i
    } else if (mapping.title === null && (h.includes('design') || h.includes('libel') || h.includes('intitul') || h.includes('descr') || h.includes('poste') || h.includes('prestation') || h === 'designation')) {
      mapping.title = i
    } else if (mapping.unit === null && (h === 'u' || h === 'pu' && false || h.includes('unit') && !h.includes('prix') || h === 'unité' || h === 'unite')) {
      mapping.unit = i
    } else if (mapping.qty === null && (h.includes('qte') || h.includes('qt ') || h.includes('quantit') || h === 'q' || h === 'nb' || h === 'qté')) {
      mapping.qty = i
    } else if (mapping.unitPrice === null && (h.includes('p.u') || h.includes('pu') || h.includes('prix unit') || h.includes('cout unit') || h === 'phu' || h === 'pu ht')) {
      mapping.unitPrice = i
    }
  }

  // Fallback : si title non trouvé, prendre la colonne la plus longue en moyenne
  if (mapping.title === null) {
    mapping.title = 0
  }

  return mapping
}

/** Détecter si une ligne est un séparateur de lot (tout caps, pas de prix) */
function isLotRow(cells: (string | number | null)[], titleCol: number): boolean {
  const text = toStr(cells[titleCol])
  if (text.length < 2) return false
  // Tout en majuscules OU commence par "LOT" / "CHAPITRE" / "TITRE"
  const upper = text === text.toUpperCase() && /[A-Z]/.test(text)
  const keyword = /^(lot|chapitre|titre|chapter|section)\b/i.test(text)
  return upper || keyword
}

// ─── Parser principal ──────────────────────────────────────────────────────────

/**
 * Retourne un aperçu (headers + 8 premières lignes de données) sans parser complètement.
 * Utilisé pour la UI de mapping manuel.
 */
export function previewExcel(buffer: Buffer): ParsePreview {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, { header: 1, defval: null }) as (string | number | null)[][]

  // Trouver la première ligne non vide comme headers
  let headerIdx = 0
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    if (rows[i].some((c) => c !== null && c !== '')) { headerIdx = i; break }
  }
  const headers = rows[headerIdx].map((c) => toStr(c))
  const dataRows = rows.slice(headerIdx + 1, headerIdx + 9).map((r) =>
    r.map((c) => (typeof c === 'number' ? c : toStr(c) || null))
  )

  return { headers, rows: dataRows, detected: detectColumns(headers) }
}

/**
 * Parse complet : retourne AIImportResult avec confidence = 100 (données brutes).
 * @param mapping Si fourni, utilise ce mapping. Sinon auto-détecte.
 */
export function parseExcelDirect(buffer: Buffer, mapping?: ColumnMapping): AIImportResult {
  const wb = XLSX.read(buffer, { type: 'buffer' })

  // Choisir le sheet le plus grand (en nombre de lignes)
  let bestSheet = wb.SheetNames[0]
  let bestCount = 0
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name]
    const ref = ws['!ref']
    if (!ref) continue
    const range = XLSX.utils.decode_range(ref)
    const count = range.e.r - range.s.r
    if (count > bestCount) { bestCount = count; bestSheet = name }
  }

  const ws = wb.Sheets[bestSheet]
  const raw = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, { header: 1, defval: null }) as (string | number | null)[][]

  // Trouver la ligne de headers (première ligne non vide avec du texte)
  let headerIdx = 0
  for (let i = 0; i < Math.min(raw.length, 15); i++) {
    const nonEmpty = raw[i].filter((c) => c !== null && c !== '').length
    if (nonEmpty >= 2) { headerIdx = i; break }
  }

  const headers = raw[headerIdx].map((c) => toStr(c))
  const map = mapping ?? detectColumns(headers)

  const lots: ImportedLot[] = []
  let currentLot: ImportedLot | null = null
  let currentSublot: ImportedSubLot | null = null
  let lotPos = 1
  let sublotPos = 1
  let postPos = 1

  for (let i = headerIdx + 1; i < raw.length; i++) {
    const row = raw[i]

    // Ignorer les lignes totalement vides
    if (row.every((c) => c === null || c === '')) continue

    const refRaw = map.ref !== null ? toStr(row[map.ref]) : ''
    const titleRaw = map.title !== null ? toStr(row[map.title]) : ''
    const unitRaw = map.unit !== null ? toStr(row[map.unit]) : 'u'
    const qtyRaw = map.qty !== null ? toNum(row[map.qty]) : null
    const priceRaw = map.unitPrice !== null ? toNum(row[map.unitPrice]) : null

    // Ignorer si ni ref ni titre
    if (!refRaw && !titleRaw) continue

    const level = refLevel(refRaw)

    // ── Niveau LOT ────────────────────────────────────────────
    if (level === 1 || (level === 0 && !refRaw && isLotRow(row, map.title ?? 0))) {
      currentSublot = null
      sublotPos = 1
      postPos = 1
      currentLot = {
        number: refRaw || String(lotPos),
        name: titleRaw || refRaw,
        sublots: [],
        posts: [],
      }
      lots.push(currentLot)
      lotPos++
      continue
    }

    // ── Niveau SOUS-LOT ───────────────────────────────────────
    if (level === 2) {
      if (!currentLot) {
        currentLot = { number: String(lotPos - 1 || 1), name: 'Lot', sublots: [], posts: [] }
        lots.push(currentLot)
      }
      postPos = 1
      currentSublot = {
        number: refRaw,
        name: titleRaw || refRaw,
        posts: [],
      }
      currentLot.sublots.push(currentSublot)
      sublotPos++
      continue
    }

    // ── Niveau POSTE (level 3 ou 0 avec données) ──────────────
    const hasData = qtyRaw !== null || priceRaw !== null || (unitRaw && unitRaw.length <= 10)
    if (level === 3 || (level === 0 && hasData && titleRaw)) {
      const post: ImportedPost = {
        ref: refRaw || undefined,
        title: titleRaw || refRaw,
        qty: qtyRaw,
        unit: unitRaw && unitRaw.length <= 10 ? unitRaw : 'u',
        unit_price: priceRaw,
        confidence: 100,
      }

      if (!currentLot) {
        currentLot = { number: String(lotPos++), name: 'Lot', sublots: [], posts: [] }
        lots.push(currentLot)
      }

      if (currentSublot) {
        currentSublot.posts.push(post)
      } else {
        currentLot.posts.push(post)
      }
      postPos++
    }
  }

  // Nettoyer les lots vides
  const filledLots = lots.filter((l) =>
    l.posts.length > 0 || l.sublots.some((s) => s.posts.length > 0)
  )

  return {
    lots: filledLots.length > 0 ? filledLots : lots,
    globalConfidence: 100,
  }
}
