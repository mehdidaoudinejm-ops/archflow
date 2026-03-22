import { NextResponse } from 'next/server'
import { requireRole, AuthError } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PDFParse } from 'pdf-parse'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_SIZE = 20 * 1024 * 1024 // 20 Mo

// ─── Types internes ──────────────────────────────────────────────────────────

interface ParsedPost {
  title: string
  unit:  string
  qty:   number | null
  prix:  number | null
}

// ─── Parsing depuis tables (getTable) ────────────────────────────────────────

const UNITS_RE = /\b(m²|m2|m³|m3|ml|mL|ens|ens\.|ff|fft|kg|h|jrs?|jour|forfait|u)\b/i

function parseNum(s: string): number | null {
  const clean = s.replace(/\s/g, '').replace(',', '.')
  const n = parseFloat(clean)
  return isNaN(n) || n <= 0 ? null : n
}

function postsFromTables(tables: string[][][]): ParsedPost[] {
  const results: ParsedPost[] = []

  for (const table of tables) {
    if (table.length < 2) continue

    // Détecter les colonnes via la première ligne
    const header = table[0].map(h => h.toLowerCase().trim())
    const colDesignation  = header.findIndex(h => /design|descri|libel|intit/.test(h))
    const colUnite        = header.findIndex(h => /unit[eé]|\bu\b/.test(h))
    const colQte          = header.findIndex(h => /qt[eé]|quant|nb\b/.test(h))
    const colPrix         = header.findIndex(h => /pu\b|prix u|unit price/.test(h))

    for (let r = 1; r < table.length; r++) {
      const row = table[r]
      if (!row || row.length === 0) continue

      let title = colDesignation >= 0 ? row[colDesignation] : row[0]
      title = title?.replace(/^\d+[\d.]*\s+/, '').trim() ?? ''
      if (title.length < 3) continue

      const unitCell = colUnite >= 0 ? row[colUnite] : ''
      const unitMatch = unitCell?.match(UNITS_RE)
      const unit = unitMatch ? unitMatch[1].toLowerCase() : 'u'

      const qty  = colQte  >= 0 ? parseNum(row[colQte]  ?? '') : null
      const prix = colPrix >= 0 ? parseNum(row[colPrix] ?? '') : null

      results.push({ title, unit, qty, prix })
    }
  }

  return results
}

// ─── Parsing depuis texte brut (getText) fallback ────────────────────────────

function postsFromText(text: string): ParsedPost[] {
  const results: ParsedPost[] = []

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3)

  for (const line of lines) {
    if (!/\d/.test(line)) continue

    const numbers: number[] = []
    for (const m of Array.from(line.matchAll(/(\d[\d\s]*(?:[.,]\d+)?)/g))) {
      const val = parseNum(m[1])
      if (val !== null) numbers.push(val)
    }
    if (numbers.length === 0) continue

    const unitMatch = line.match(UNITS_RE)
    const unit = unitMatch ? unitMatch[1].toLowerCase() : 'u'

    let title = line
    if (unitMatch?.index !== undefined) {
      title = line.slice(0, unitMatch.index).trim()
    } else {
      const firstNum = line.search(/\s{2,}\d/)
      if (firstNum > 0) title = line.slice(0, firstNum).trim()
    }
    title = title.replace(/^\d+[\d.]*\s+/, '').trim()
    if (title.length < 3) continue

    const prix = numbers.length >= 1 ? numbers[numbers.length - 1] : null
    const qty  = numbers.length >= 2 ? numbers[numbers.length - 2] : null

    if (prix !== null) results.push({ title, unit, qty, prix })
  }

  return results
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const formData = await req.formData()
    const file   = formData.get('file')    as File   | null
    const dpgfId = formData.get('dpgfId') as string | null

    if (!file)   return NextResponse.json({ error: 'Fichier manquant' },  { status: 400 })
    if (!dpgfId) return NextResponse.json({ error: 'dpgfId manquant' },   { status: 400 })

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 20 Mo)' }, { status: 400 })
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Seuls les fichiers PDF sont acceptés' }, { status: 400 })
    }

    // Vérifier que le DPGF appartient à l'agence
    const dpgf = await prisma.dPGF.findFirst({
      where: { id: dpgfId, project: { agencyId: user.agencyId! } },
      include: { lots: { select: { number: true } } },
    })
    if (!dpgf) return NextResponse.json({ error: 'DPGF introuvable' }, { status: 404 })

    // ── 1. Extraction du PDF ───────────────────────────────────────────────
    let posts: ParsedPost[]
    try {
      const pdfBuffer = Buffer.from(await file.arrayBuffer())
      const parser = new PDFParse({ data: pdfBuffer })

      // Essai 1 : extraction par tableaux (meilleur résultat sur DPGF)
      let usedTable = false
      try {
        const tableResult = await parser.getTable()
        const allTables = tableResult.pages.flatMap(p => p.tables)
        if (allTables.length > 0) {
          posts = postsFromTables(allTables)
          usedTable = posts.length > 0
        }
      } catch { /* pas de tables détectées */ }

      // Essai 2 : fallback texte brut
      if (!usedTable!) {
        const textResult = await parser.getText()
        posts = postsFromText(textResult.text)
      }

      await parser.destroy()

      if (posts!.length === 0) {
        return NextResponse.json({ error: 'parsing_failed' }, { status: 422 })
      }
    } catch (err) {
      console.error('[import-pdf] Extraction PDF échouée:', err)
      return NextResponse.json({ error: 'conversion_failed' }, { status: 422 })
    }

    // ── 2. Insertion dans la DPGF ──────────────────────────────────────────
    const existingNumbers = dpgf.lots.map((l) => l.number)
    const nextLotNumber   = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1

    const lot = await prisma.lot.create({
      data: {
        dpgfId,
        number:   nextLotNumber,
        name:     file.name.replace(/\.pdf$/i, ''),
        position: nextLotNumber,
      },
    })

    let imported = 0
    let skipped  = 0

    for (let i = 0; i < posts!.length; i++) {
      const { title, unit, qty, prix } = posts![i]
      if (!title) { skipped++; continue }

      const position = i + 1
      await prisma.post.create({
        data: {
          lotId:          lot.id,
          ref:            `${String(nextLotNumber).padStart(2, '0')}.${String(position).padStart(2, '0')}`,
          title,
          unit,
          qtyArchi:       qty  ?? undefined,
          unitPriceArchi: prix ?? undefined,
          position,
        },
      })
      imported++
    }

    return NextResponse.json({ success: true, imported, skipped })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[import-pdf]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
