export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { prisma } from '@/lib/prisma'
import { requirePortalAuth } from '@/lib/portal-auth'
import { AuthError } from '@/lib/auth'

// Couleurs de style
const GREEN_BG = { fgColor: { rgb: '1A5C3A' } }
const GREEN_FONT = { color: { rgb: 'FFFFFF' }, bold: true, sz: 11 }
const LOT_BG = { fgColor: { rgb: 'EAF3ED' } }
const LOT_FONT = { bold: true, sz: 11, color: { rgb: '1A5C3A' } }
const EDITABLE_BG = { fgColor: { rgb: 'FFFBEB' } } // jaune clair
const HEADER_FONT = { bold: true, sz: 10, color: { rgb: '6B6B65' } }
const BORDER_THIN = {
  top: { style: 'thin', color: { rgb: 'E8E8E3' } },
  bottom: { style: 'thin', color: { rgb: 'E8E8E3' } },
  left: { style: 'thin', color: { rgb: 'E8E8E3' } },
  right: { style: 'thin', color: { rgb: 'E8E8E3' } },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cell(v: string | number | null, style?: Record<string, any>): XLSX.CellObject {
  if (v === null || v === undefined) return { t: 'z', v: undefined, s: style }
  return { t: typeof v === 'number' ? 'n' : 's', v, s: style }
}

export async function GET(req: Request, { params }: { params: { aoId: string } }) {
  try {
    const { aoCompany } = await requirePortalAuth(req, params.aoId)

    // Récupérer l'AO + lots + posts (sans estimatif archi)
    const ao = await prisma.aO.findUnique({
      where: { id: params.aoId },
      select: { id: true, name: true, deadline: true, lotIds: true, dpgfId: true, status: true },
    })
    if (!ao || ao.status === 'CLOSED' || ao.status === 'ARCHIVED') {
      return NextResponse.json({ error: 'AO clôturé' }, { status: 400 })
    }

    const lots = await prisma.lot.findMany({
      where: { id: { in: ao.lotIds }, dpgfId: ao.dpgfId },
      orderBy: { position: 'asc' },
      select: {
        id: true, number: true, name: true,
        posts: {
          orderBy: { position: 'asc' },
          select: { id: true, ref: true, title: true, unit: true, qtyArchi: true, isOptional: true },
        },
      },
    })

    // Récupérer les prix déjà saisis (pour pré-remplir)
    const existingOffer = await prisma.offer.findFirst({
      where: { aoCompanyId: aoCompany.id },
      select: { offerPosts: { select: { postId: true, unitPrice: true, comment: true } } },
    })
    const priceMap = new Map<string, { unitPrice: number | null; comment: string | null }>()
    existingOffer?.offerPosts.forEach((p) => {
      priceMap.set(p.postId, { unitPrice: p.unitPrice, comment: p.comment })
    })

    // ── Construire la feuille ──────────────────────────────────────────────────

    // Colonnes : A=postId(caché) | B=Réf | C=Désignation | D=Unité | E=Quantité | F=Prix unit. HT | G=Commentaire
    const COL_HEADERS = ['__id__', 'Réf', 'Désignation', 'Unité', 'Quantité', 'Prix unitaire HT', 'Commentaire']
    const rows: XLSX.CellObject[][] = []

    // Ligne 1 : instructions (sur toute la largeur)
    const instrCell: XLSX.CellObject = {
      t: 's',
      v: '⚠ Remplissez uniquement les colonnes "Prix unitaire HT" et "Commentaire". Ne modifiez pas les autres colonnes (Réf, Désignation, __id__, etc.).',
      s: {
        font: { sz: 10, italic: true, color: { rgb: '9B1C1C' } },
        fill: { fgColor: { rgb: 'FEE8E8' } },
        alignment: { wrapText: true, vertical: 'center' },
      },
    }
    rows.push([instrCell, cell(''), cell(''), cell(''), cell(''), cell(''), cell('')])

    // Ligne 2 : vide
    rows.push(COL_HEADERS.map(() => cell('')))

    // Ligne 3 : en-têtes colonnes
    rows.push(
      COL_HEADERS.map((h, i) => ({
        t: 's' as const,
        v: h,
        s: {
          font: i === 0 ? { sz: 9, color: { rgb: 'C4C4BC' } } : GREEN_FONT,
          fill: i === 0 ? { fgColor: { rgb: 'F3F3F0' } } : GREEN_BG,
          border: BORDER_THIN,
          alignment: { horizontal: 'center' as const, vertical: 'center' as const },
        },
      }))
    )

    // Lignes de données : lots + posts
    for (const lot of lots) {
      // Ligne séparateur de lot
      const lotLabel = `LOT ${lot.number} — ${lot.name.toUpperCase()}`
      rows.push([
        cell(''),
        cell(lotLabel, { font: LOT_FONT, fill: LOT_BG, border: BORDER_THIN }),
        cell('', { fill: LOT_BG, border: BORDER_THIN }),
        cell('', { fill: LOT_BG, border: BORDER_THIN }),
        cell('', { fill: LOT_BG, border: BORDER_THIN }),
        cell('', { fill: LOT_BG, border: BORDER_THIN }),
        cell('', { fill: LOT_BG, border: BORDER_THIN }),
      ])

      for (const post of lot.posts) {
        const existing = priceMap.get(post.id)
        const unitPrice = existing?.unitPrice ?? null
        const comment = existing?.comment ?? null

        rows.push([
          // A: postId (grayed out, small)
          { t: 's', v: post.id, s: { font: { sz: 8, color: { rgb: 'C4C4BC' } }, alignment: { horizontal: 'center' }, border: BORDER_THIN } },
          // B: Réf
          { t: 's', v: post.ref, s: { font: { sz: 10 }, alignment: { horizontal: 'center' }, border: BORDER_THIN } },
          // C: Désignation
          {
            t: 's',
            v: post.title + (post.isOptional ? ' (optionnel)' : ''),
            s: { font: { sz: 10 }, alignment: { wrapText: true, vertical: 'top' }, border: BORDER_THIN },
          },
          // D: Unité
          { t: 's', v: post.unit, s: { font: { sz: 10 }, alignment: { horizontal: 'center' }, border: BORDER_THIN } },
          // E: Quantité
          post.qtyArchi !== null
            ? { t: 'n', v: post.qtyArchi, s: { numFmt: '#,##0.##', font: { sz: 10 }, alignment: { horizontal: 'right' }, border: BORDER_THIN } }
            : { t: 'z', v: undefined, s: { border: BORDER_THIN } },
          // F: Prix unitaire HT (éditable)
          unitPrice !== null
            ? { t: 'n', v: unitPrice, s: { numFmt: '#,##0.00 "€"', fill: EDITABLE_BG, font: { sz: 10, color: { rgb: '1A5C3A' } }, alignment: { horizontal: 'right' }, border: BORDER_THIN } }
            : { t: 'z', v: undefined, s: { fill: EDITABLE_BG, border: BORDER_THIN } },
          // G: Commentaire (éditable)
          comment
            ? { t: 's', v: comment, s: { fill: EDITABLE_BG, font: { sz: 10 }, alignment: { wrapText: true, vertical: 'top' }, border: BORDER_THIN } }
            : { t: 'z', v: undefined, s: { fill: EDITABLE_BG, border: BORDER_THIN } },
        ])
      }
    }

    // ── Créer le workbook ──────────────────────────────────────────────────────
    const ws = XLSX.utils.aoa_to_sheet(rows.map((r) => r.map((c) => c.v)))

    // Appliquer les styles cellule par cellule
    const colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    rows.forEach((row, r) => {
      row.forEach((cellObj, c) => {
        const addr = `${colLetters[c]}${r + 1}`
        if (!ws[addr]) ws[addr] = { t: 'z', v: undefined }
        ws[addr]!.s = cellObj.s
      })
    })

    // Fusion de la ligne d'instructions sur toute la largeur
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }]

    // Largeurs de colonnes
    ws['!cols'] = [
      { wch: 10 },  // A: postId (étroit)
      { wch: 8 },   // B: Réf
      { wch: 45 },  // C: Désignation
      { wch: 8 },   // D: Unité
      { wch: 10 },  // E: Quantité
      { wch: 16 },  // F: Prix unitaire HT
      { wch: 30 },  // G: Commentaire
    ]

    // Hauteurs de lignes
    ws['!rows'] = [{ hpt: 36 }] // ligne instructions plus haute

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'DQE')

    const deadline = ao.deadline.toLocaleDateString('fr-FR').replace(/\//g, '-')
    const filename = `DQE_${ao.name.replace(/[^a-zA-Z0-9]/g, '_')}_${deadline}.xlsx`

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true })

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[GET /api/portal/[aoId]/dqe-export]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
