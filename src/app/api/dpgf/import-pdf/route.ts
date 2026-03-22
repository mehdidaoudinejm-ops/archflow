import { NextResponse } from 'next/server'
import { requireRole, AuthError } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import jwt from 'jsonwebtoken'
import FormData from 'form-data'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_SIZE = 20 * 1024 * 1024 // 20 Mo
const ILOVEPDF_API = 'https://api.ilovepdf.com/v1'

// ─── Helpers iLovePDF REST ───────────────────────────────────────────────────

/** Génère un JWT signé avec la secret key (identique au SDK officiel). */
function getIlovePdfToken(): string {
  const timeNow = Date.now() / 1000
  return jwt.sign(
    { jti: process.env.ILOVEPDF_PUBLIC_KEY, iss: 'api.ilovepdf.com', iat: timeNow - 5 },
    process.env.ILOVEPDF_SECRET_KEY!,
  )
}

interface StartTaskResponse { server: string; task: string }
interface UploadResponse    { server_filename: string }

async function ilovepdfConvert(pdfBuffer: Buffer, filename: string): Promise<Buffer> {
  const token = getIlovePdfToken()
  const authHeader = `Bearer ${token}`

  // 1. Démarrer la tâche pdftoxls
  const startRes = await fetch(`${ILOVEPDF_API}/start/pdftoxls`, {
    headers: { Authorization: authHeader },
  })
  if (!startRes.ok) {
    const body = await startRes.text()
    throw new Error(`iLovePDF start failed (${startRes.status}): ${body}`)
  }
  const { server, task } = await startRes.json() as StartTaskResponse

  // 2. Uploader le PDF
  const uploadForm = new FormData()
  uploadForm.append('task', task)
  uploadForm.append('file', pdfBuffer, { filename, contentType: 'application/pdf' })

  const uploadRes = await fetch(`https://${server}/v1/upload`, {
    method: 'POST',
    headers: { Authorization: authHeader, ...uploadForm.getHeaders() },
    body: uploadForm.getBuffer(),
  })
  if (!uploadRes.ok) {
    const body = await uploadRes.text()
    throw new Error(`iLovePDF upload failed (${uploadRes.status}): ${body}`)
  }
  const { server_filename } = await uploadRes.json() as UploadResponse

  // 3. Lancer la conversion
  const processRes = await fetch(`https://${server}/v1/process`, {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task,
      tool: 'pdftoxls',
      files: [{ server_filename, filename }],
    }),
  })
  if (!processRes.ok) {
    const body = await processRes.text()
    throw new Error(`iLovePDF process failed (${processRes.status}): ${body}`)
  }

  // 4. Télécharger le résultat
  const downloadRes = await fetch(`https://${server}/v1/download/${task}`, {
    headers: { Authorization: authHeader },
  })
  if (!downloadRes.ok) {
    const body = await downloadRes.text()
    throw new Error(`iLovePDF download failed (${downloadRes.status}): ${body}`)
  }

  return Buffer.from(await downloadRes.arrayBuffer())
}

// ─── Détection de colonnes par mots-clés ────────────────────────────────────

interface ColumnMap {
  designation: string | null
  unite: string | null
  quantite: string | null
  prixUnitaire: string | null
}

function detectColumns(headers: string[]): ColumnMap {
  const find = (keywords: string[]) =>
    headers.find((h) => keywords.some((k) => h.toLowerCase().includes(k))) ?? null

  return {
    designation:  find(['designation', 'description', 'libellé', 'libelle', 'intitulé', 'intitule', 'désignation']),
    unite:        find([' u ', 'unité', 'unite', 'unit']),
    quantite:     find(['qté', 'quantité', 'quantite', 'qte', ' nb ']),
    prixUnitaire: find(['pu', 'prix unitaire', 'prix unit', 'unit price', 'prix u']),
  }
}

// ─── Route ──────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const formData = await req.formData()
    const file   = formData.get('file')    as File   | null
    const dpgfId = formData.get('dpgfId') as string | null

    if (!file)   return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
    if (!dpgfId) return NextResponse.json({ error: 'dpgfId manquant' }, { status: 400 })

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

    // ── 1. Conversion PDF → xlsx via iLovePDF REST ─────────────────────────
    let xlsxBuffer: Buffer
    try {
      const pdfBuffer = Buffer.from(await file.arrayBuffer())
      xlsxBuffer = await ilovepdfConvert(pdfBuffer, file.name)
    } catch (err) {
      console.error('[import-pdf] Conversion iLovePDF échouée:', err)
      return NextResponse.json({ error: 'conversion_failed' }, { status: 502 })
    }

    // ── 2. Parsing xlsx ────────────────────────────────────────────────────
    let rows: Record<string, unknown>[]
    let cols: ColumnMap

    try {
      const workbook = XLSX.read(xlsxBuffer, { type: 'buffer' })
      const sheet    = workbook.Sheets[workbook.SheetNames[0]]
      rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

      if (rows.length === 0) return NextResponse.json({ error: 'parsing_failed' }, { status: 422 })

      cols = detectColumns(Object.keys(rows[0]))
      if (!cols.designation) return NextResponse.json({ error: 'parsing_failed' }, { status: 422 })
    } catch (err) {
      console.error('[import-pdf] Parsing XLSX échoué:', err)
      return NextResponse.json({ error: 'parsing_failed' }, { status: 422 })
    }

    // ── 3. Insertion dans la DPGF ──────────────────────────────────────────
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
    let position = 0

    for (const row of rows) {
      const designation = cols.designation
        ? String(row[cols.designation] ?? '').trim()
        : ''

      if (!designation) { skipped++; continue }

      const unite  = cols.unite  ? String(row[cols.unite]  ?? '').trim() || 'u' : 'u'
      const qtyRaw = cols.quantite     ? row[cols.quantite]     : null
      const prxRaw = cols.prixUnitaire ? row[cols.prixUnitaire] : null
      const qty    = qtyRaw !== null && qtyRaw !== '' ? parseFloat(String(qtyRaw)) : null
      const prix   = prxRaw !== null && prxRaw !== '' ? parseFloat(String(prxRaw)) : null

      position++
      await prisma.post.create({
        data: {
          lotId:          lot.id,
          ref:            `${String(nextLotNumber).padStart(2, '0')}.${String(position).padStart(2, '0')}`,
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
