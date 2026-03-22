import { NextResponse } from 'next/server'
import { requireRole, AuthError } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { extractText } from 'unpdf'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_SIZE = 20 * 1024 * 1024 // 20 Mo

// ─── Parsing du texte extrait ────────────────────────────────────────────────

interface ParsedPost {
  title: string
  unit:  string
  qty:   number | null
  prix:  number | null
}

// Unités reconnues dans un DPGF (insensible à la casse)
const UNITS_STR = 'm²|m2|m³|m3|ML|ml|ENS|FF|FFT|KG|H|U|FORFAIT|JRS?|jour|ens\\.?|ff|fft|kg|h|u|forfait'

// Chaque poste a la forme :  [ref -] désignation  UNITÉ  nb nb ...
// On cherche : du texte + une unité reconnue + au moins un nombre
const POST_RE = new RegExp(
  `([\\wÀ-öø-ÿ][\\wÀ-öø-ÿ\\s'',()\\[\\]\\-/]{2,120})` + // désignation
  `\\s+(${UNITS_STR})` +                                    // unité
  `\\s+([\\d][\\d\\s,.]{0,50})`,                            // nombres (qty, PU, total…)
  'gi'
)

function parseNum(s: string): number | null {
  const n = parseFloat(s.replace(/\s/g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}

function postsFromText(text: string): ParsedPost[] {
  const results: ParsedPost[] = []

  for (const match of Array.from(text.matchAll(POST_RE))) {
    // Nettoyer la désignation : supprimer la référence de début (ex: "2.1.1 - ")
    let title = match[1].trim().replace(/^\d[\d.\s]*[-–]\s*/, '').trim()
    if (title.length < 3) continue

    const unit = match[2].toLowerCase()

    // Extraire les nombres (qty / PU / total)
    const nums = match[3]
      .trim()
      .split(/\s+/)
      .map(s => parseNum(s))
      .filter((n): n is number => n !== null)

    // Format : qty  PU  Total  →  on prend qty + PU
    //          qty  Total      →  on prend qty + Total comme PU
    //          PU seul         →  on prend uniquement le prix
    const qty  = nums.length >= 2 ? nums[0] : null
    const prix = nums.length >= 3 ? nums[1]
               : nums.length >= 1 ? nums[nums.length - 1]
               : null

    results.push({ title, unit, qty, prix })
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

    const dpgf = await prisma.dPGF.findFirst({
      where: { id: dpgfId, project: { agencyId: user.agencyId! } },
      include: { lots: { select: { number: true } } },
    })
    if (!dpgf) return NextResponse.json({ error: 'DPGF introuvable' }, { status: 404 })

    // ── 1. Extraction du texte ─────────────────────────────────────────────
    let posts: ParsedPost[]
    try {
      const pdfBuffer = new Uint8Array(await file.arrayBuffer())
      const { text } = await extractText(pdfBuffer, { mergePages: true })
      console.log('[import-pdf] Texte extrait (500 premiers chars):', text.slice(0, 500))
      console.log('[import-pdf] Nombre de lignes brutes:', text.split('\n').filter(l => l.trim().length > 3).length)
      posts = postsFromText(text)
      console.log('[import-pdf] Posts détectés:', posts.length)
      console.log('[import-pdf] Exemples:', JSON.stringify(posts.slice(0, 3)))

      if (posts.length === 0) {
        return NextResponse.json({ error: 'parsing_failed' }, { status: 422 })
      }
    } catch (err) {
      console.error('[import-pdf] Extraction échouée:', err)
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

    for (let i = 0; i < posts.length; i++) {
      const { title, unit, qty, prix } = posts[i]
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
