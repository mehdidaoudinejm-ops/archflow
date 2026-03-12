export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { prisma } from '@/lib/prisma'
import { requirePortalAuth } from '@/lib/portal-auth'
import { AuthError } from '@/lib/auth'

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\s/g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}

function toStr(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

export async function POST(req: Request, { params }: { params: { aoId: string } }) {
  try {
    const { aoCompany } = await requirePortalAuth(req, params.aoId)

    // Vérifier que l'AO est encore ouvert
    const ao = await prisma.aO.findUnique({
      where: { id: params.aoId },
      select: { status: true, lotIds: true, dpgfId: true },
    })
    if (!ao || ao.status === 'CLOSED' || ao.status === 'ARCHIVED') {
      return NextResponse.json({ error: 'Cet AO est clôturé' }, { status: 400 })
    }

    // Parser le fichier multipart
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer', cellStyles: false })

    const sheetName = wb.SheetNames[0]
    if (!sheetName) {
      return NextResponse.json({ error: 'Fichier Excel vide ou invalide' }, { status: 400 })
    }

    const ws = wb.Sheets[sheetName]!
    // sheet_to_json avec header:1 → tableau de tableaux
    const allRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null })

    // ── Trouver la ligne d'en-tête ────────────────────────────────────────────
    // On cherche la ligne qui contient "__id__" (colonne postId)
    let headerRowIdx = -1
    let idColIdx = -1
    let priceColIdx = -1
    let commentColIdx = -1

    for (let r = 0; r < Math.min(allRows.length, 10); r++) {
      const row = allRows[r] as unknown[]
      for (let c = 0; c < row.length; c++) {
        const val = toStr(row[c]).toLowerCase()
        if (val === '__id__') { headerRowIdx = r; idColIdx = c }
        if (val.includes('prix') || val.includes('price')) priceColIdx = c
        if (val.includes('commentaire') || val.includes('comment')) commentColIdx = c
      }
      if (headerRowIdx === r && idColIdx >= 0) break
    }

    if (headerRowIdx < 0 || idColIdx < 0) {
      return NextResponse.json({ error: 'Format de fichier non reconnu. Utilisez uniquement le fichier DQE téléchargé depuis ce portail.' }, { status: 400 })
    }
    if (priceColIdx < 0) {
      return NextResponse.json({ error: 'Colonne "Prix unitaire HT" introuvable dans le fichier.' }, { status: 400 })
    }

    // ── Récupérer les post IDs valides pour cet AO ───────────────────────────
    const validPosts = await prisma.post.findMany({
      where: { lot: { id: { in: ao.lotIds }, dpgfId: ao.dpgfId } },
      select: { id: true },
    })
    const validPostIds = new Set(validPosts.map((p) => p.id))

    // ── Parser les lignes de données ─────────────────────────────────────────
    const parsedPosts: { postId: string; unitPrice: number | null; comment: string | null }[] = []
    let skippedRows = 0

    for (let r = headerRowIdx + 1; r < allRows.length; r++) {
      const row = allRows[r] as unknown[]
      const postId = toStr(row[idColIdx])
      if (!postId || !validPostIds.has(postId)) {
        // Ligne de séparateur (lot) ou ligne vide — ignorer silencieusement
        if (postId && !validPostIds.has(postId)) skippedRows++
        continue
      }

      const unitPrice = toNum(row[priceColIdx])
      const comment = commentColIdx >= 0 ? (toStr(row[commentColIdx]) || null) : null

      parsedPosts.push({ postId, unitPrice, comment })
    }

    const withPrice = parsedPosts.filter((p) => p.unitPrice !== null)

    if (parsedPosts.length === 0) {
      return NextResponse.json({ error: 'Aucun poste reconnu dans le fichier. Vérifiez que vous utilisez bien le fichier DQE téléchargé depuis ce portail.' }, { status: 400 })
    }

    // ── Sauvegarder dans l'offre ─────────────────────────────────────────────
    // Upsert offer
    let offer = await prisma.offer.findFirst({
      where: { aoCompanyId: aoCompany.id },
      select: { id: true },
    })

    if (!offer) {
      offer = await prisma.offer.create({
        data: { aoId: params.aoId, aoCompanyId: aoCompany.id },
        select: { id: true },
      })
    }

    const offerId = offer.id

    // Upsert des offerPosts (uniquement ceux avec une valeur à écrire)
    const postsToSave = parsedPosts.filter((p) => p.unitPrice !== null || p.comment !== null)

    // Récupérer les OfferPost existants pour cet offre
    const existingOfferPosts = await prisma.offerPost.findMany({
      where: { offerId },
      select: { id: true, postId: true },
    })
    const existingMap = new Map(existingOfferPosts.map((op) => [op.postId, op.id]))

    await prisma.$transaction([
      // Mettre à jour les existants
      ...postsToSave
        .filter((p) => existingMap.has(p.postId))
        .map((p) =>
          prisma.offerPost.update({
            where: { id: existingMap.get(p.postId)! },
            data: { unitPrice: p.unitPrice, comment: p.comment },
          })
        ),
      // Créer les nouveaux
      ...postsToSave
        .filter((p) => !existingMap.has(p.postId))
        .map((p) =>
          prisma.offerPost.create({
            data: { offerId, postId: p.postId, unitPrice: p.unitPrice, comment: p.comment },
          })
        ),
    ])

    // Mettre à jour le statut
    await prisma.aOCompany.update({
      where: { id: aoCompany.id },
      data: { status: 'IN_PROGRESS' },
    })

    return NextResponse.json({
      ok: true,
      total: parsedPosts.length,
      withPrice: withPrice.length,
      saved: postsToSave.length,
      skipped: skippedRows,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[POST /api/portal/[aoId]/dqe-import]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
