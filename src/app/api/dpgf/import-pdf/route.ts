import { NextResponse } from 'next/server'
import { requireRole, AuthError } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
// Import direct du lib pour éviter le chargement du fichier de test au démarrage (bug serverless)
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require('pdf-parse/lib/pdf-parse.js')

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_SIZE = 20 * 1024 * 1024 // 20 Mo

// ─── Parsing du texte PDF ────────────────────────────────────────────────────
//
// Un DPGF PDF a typiquement des lignes de la forme :
//   [ref]  Désignation ...........  unité   qté   prix_unitaire
//
// Stratégie :
//  1. Extraire le texte brut avec pdf-parse
//  2. Découper ligne par ligne
//  3. Détecter les lignes "poste" : celles qui contiennent du texte + au
//     moins un nombre (prix ou quantité)
//  4. Extraire designation / unite / quantite / prixUnitaire avec des regex

interface ParsedPost {
  title: string
  unit:  string
  qty:   number | null
  prix:  number | null
}

// Unités courantes dans un DPGF
const UNITS = ['m²', 'm2', 'm³', 'm3', 'ml', 'ml.', 'ml,', 'mL', 'u', 'ens', 'ens.', 'ff', 'ft', 'kg', 'h', 'jrs', 'jour', 'forfait', 'fft']
const UNITS_RE = new RegExp(`\\b(${UNITS.map(u => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'i')

// Nombre décimal (peut contenir espace ou virgule comme séparateur)
const NUM_RE = /[\d\s]+(?:[.,]\d+)?/

function parseLines(text: string): ParsedPost[] {
  const results: ParsedPost[] = []

  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 3)

  for (const line of lines) {
    // Ignorer les lignes de séparation, titres sans contenu chiffré
    // On cherche au moins un nombre dans la ligne
    if (!/\d/.test(line)) continue

    // Extraire les nombres de fin de ligne (prix, quantité)
    // Format typique : "... désignation   m²   120   25,00"
    const numbers: number[] = []
    const numMatches = Array.from(line.matchAll(/(\d[\d\s]*(?:[.,]\d+)?)/g))
    for (const m of numMatches) {
      const val = parseFloat(m[1].replace(/\s/g, '').replace(',', '.'))
      if (!isNaN(val) && val > 0) numbers.push(val)
    }

    if (numbers.length === 0) continue

    // Détecter l'unité
    const unitMatch = line.match(UNITS_RE)
    const unit = unitMatch ? unitMatch[1].toLowerCase() : 'u'

    // Extraire la désignation : tout ce qui précède l'unité ou les premiers chiffres
    let title = line
    if (unitMatch?.index !== undefined) {
      title = line.slice(0, unitMatch.index).trim()
    } else {
      // Prendre tout jusqu'au premier gros bloc de chiffres
      const firstNum = line.search(/\s{2,}\d/)
      if (firstNum > 0) title = line.slice(0, firstNum).trim()
    }

    // Nettoyer la désignation : retirer la référence de début (ex: "01.02 ")
    title = title.replace(/^\d+[\d.]*\s+/, '').trim()

    // Si la désignation est vide ou trop courte, ignorer
    if (title.length < 3) continue

    // Quantité = avant-dernier nombre, Prix = dernier nombre
    // S'il n'y a qu'un nombre, c'est probablement le prix unitaire
    const prix = numbers.length >= 1 ? numbers[numbers.length - 1] : null
    const qty  = numbers.length >= 2 ? numbers[numbers.length - 2] : null

    // Ignorer les lignes où le "prix" semble être juste un numéro de page/ref
    if (prix !== null && prix > 0 && title.length >= 3) {
      results.push({ title, unit, qty, prix })
    }
  }

  return results
}

// ─── Route ──────────────────────────────────────────────────────────────────

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

    // ── 1. Extraction du texte PDF ─────────────────────────────────────────
    let posts: ParsedPost[]
    try {
      const pdfBuffer = Buffer.from(await file.arrayBuffer())
      const data = await pdfParse(pdfBuffer) as { text: string }
      posts = parseLines(data.text)

      if (posts.length === 0) {
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
