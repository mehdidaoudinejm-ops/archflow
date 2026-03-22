import { NextResponse } from 'next/server'
import { requireRole, AuthError } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import ILovePDFApi from '@ilovepdf/ilovepdf-nodejs'
import ILovePDFFile from '@ilovepdf/ilovepdf-nodejs/ILovePDFFile'
import type ILovePDFTool from '@ilovepdf/ilovepdf-js-core/types/ILovePDFTool'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_SIZE = 20 * 1024 * 1024 // 20 Mo

// ─── Détection de colonnes par mots-clés ────────────────────────────────────

interface ColumnMap {
  designation: string | null
  unite: string | null
  quantite: string | null
  prixUnitaire: string | null
}

function detectColumns(headers: string[]): ColumnMap {
  const find = (keywords: string[]) =>
    headers.find((h) =>
      keywords.some((k) => h.toLowerCase().includes(k))
    ) ?? null

  return {
    designation: find(['designation', 'description', 'libellé', 'libelle', 'intitulé', 'intitule', 'désignation']),
    unite:       find([' u ', 'unité', 'unite', 'unit']),
    quantite:    find(['qté', 'quantité', 'quantite', 'qte', ' nb ']),
    prixUnitaire: find(['pu', 'prix unitaire', 'prix unit', 'unit price', 'prix u']),
  }
}

// ─── Route ──────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const formData = await req.formData()
    const file    = formData.get('file')    as File   | null
    const dpgfId  = formData.get('dpgfId') as string | null

    if (!file)   return NextResponse.json({ error: 'Fichier manquant' },  { status: 400 })
    if (!dpgfId) return NextResponse.json({ error: 'dpgfId manquant' },   { status: 400 })

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 20 Mo)' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Seuls les fichiers PDF sont acceptés par ce endpoint' }, { status: 400 })
    }

    // Vérifier que le DPGF appartient à l'agence de l'utilisateur
    const dpgf = await prisma.dPGF.findFirst({
      where: { id: dpgfId, project: { agencyId: user.agencyId! } },
      include: { lots: { select: { number: true } } },
    })
    if (!dpgf) return NextResponse.json({ error: 'DPGF introuvable' }, { status: 404 })

    // ── 1. Conversion PDF → xlsx via iLovePDF ──────────────────────────────
    let xlsxBuffer: Buffer
    try {
      const pdfBuffer = Buffer.from(await file.arrayBuffer())

      const ilovepdf = new ILovePDFApi(
        process.env.ILOVEPDF_PUBLIC_KEY!,
        process.env.ILOVEPDF_SECRET_KEY!,
      )
      // 'pdftoxls' est valide côté API mais absent des types SDK v0.3.1
      const task = ilovepdf.newTask('pdftoxls' as ILovePDFTool)
      await task.start()
      await task.addFile(ILovePDFFile.fromArray(pdfBuffer, file.name))
      await task.process()
      xlsxBuffer = Buffer.from(await task.download() as ArrayBuffer)
    } catch (err) {
      console.error('[import-pdf] Conversion iLovePDF échouée:', err)
      return NextResponse.json({ error: 'conversion_failed' }, { status: 502 })
    }

    // ── 2. Parsing du xlsx ─────────────────────────────────────────────────
    let rows: Record<string, unknown>[]
    let cols: ColumnMap

    try {
      const workbook = XLSX.read(xlsxBuffer, { type: 'buffer' })
      const sheet    = workbook.Sheets[workbook.SheetNames[0]]
      rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

      if (rows.length === 0) {
        return NextResponse.json({ error: 'parsing_failed' }, { status: 422 })
      }

      cols = detectColumns(Object.keys(rows[0]))

      if (!cols.designation) {
        return NextResponse.json({ error: 'parsing_failed' }, { status: 422 })
      }
    } catch (err) {
      console.error('[import-pdf] Parsing XLSX échoué:', err)
      return NextResponse.json({ error: 'parsing_failed' }, { status: 422 })
    }

    // ── 3. Insertion dans la DPGF ──────────────────────────────────────────
    const existingNumbers = dpgf.lots.map((l) => l.number)
    const nextLotNumber   = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1
    const lotName         = file.name.replace(/\.pdf$/i, '')

    const lot = await prisma.lot.create({
      data: {
        dpgfId,
        number:   nextLotNumber,
        name:     lotName,
        position: nextLotNumber,
      },
    })

    let imported = 0
    let skipped  = 0
    let position = 0

    for (const row of rows) {
      const designation = cols.designation
        ? String(row[cols.designation] ?? '').trim()
        : ''

      if (!designation) {
        skipped++
        continue
      }

      const unite  = cols.unite  ? String(row[cols.unite]  ?? '').trim() || 'u' : 'u'
      const qtyRaw = cols.quantite     ? row[cols.quantite]     : null
      const prxRaw = cols.prixUnitaire ? row[cols.prixUnitaire] : null

      const qty  = qtyRaw !== null && qtyRaw !== '' ? parseFloat(String(qtyRaw)) : null
      const prix = prxRaw !== null && prxRaw !== '' ? parseFloat(String(prxRaw)) : null

      position++
      const ref = `${String(nextLotNumber).padStart(2, '0')}.${String(position).padStart(2, '0')}`

      await prisma.post.create({
        data: {
          lotId:          lot.id,
          ref,
          title:          designation,
          unit:           unite,
          qtyArchi:       qty  !== null && !isNaN(qty)  ? qty  : undefined,
          unitPriceArchi: prix !== null && !isNaN(prix) ? prix : undefined,
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
