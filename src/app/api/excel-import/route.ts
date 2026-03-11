import { NextResponse } from 'next/server'
import { requireRole, AuthError } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseExcelDirect } from '@/lib/excel-direct'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_SIZE = 10 * 1024 * 1024 // 10 Mo

export async function POST(req: Request) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const url = new URL(req.url)
    const dpgfId = url.searchParams.get('dpgfId')
    if (!dpgfId) {
      return NextResponse.json({ error: 'dpgfId manquant' }, { status: 400 })
    }

    // Vérifier que le DPGF appartient à l'agence de l'utilisateur
    const dpgf = await prisma.dPGF.findFirst({
      where: { id: dpgfId, project: { agencyId: user.agencyId! } },
    })
    if (!dpgf) {
      return NextResponse.json({ error: 'DPGF introuvable' }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo)' }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    const isExcel =
      file.type.includes('spreadsheet') ||
      file.type.includes('excel') ||
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls') ||
      fileName.endsWith('.csv')

    if (!isExcel) {
      return NextResponse.json(
        { error: "L'import direct ne supporte que les fichiers Excel (xlsx, xls, csv)." },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    let result
    try {
      result = parseExcelDirect(buffer)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[excel-import] Erreur parsing:', msg)
      return NextResponse.json(
        { error: 'Impossible de lire le fichier. Vérifiez que le format est bien xlsx/xls/csv.' },
        { status: 422 }
      )
    }

    if (result.lots.length === 0) {
      return NextResponse.json(
        { error: 'Aucun lot détecté. Vérifiez la structure du fichier (colonnes référence, désignation, etc.).' },
        { status: 422 }
      )
    }

    // Créer l'enregistrement AIImport (réutilisation du modèle, aiModel = 'direct-excel')
    const aiImport = await prisma.aIImport.create({
      data: {
        dpgfId,
        originalFilename: file.name,
        fileType: 'excel',
        aiModel: 'direct-excel',
        rawResponse: result as object,
        confidenceScores: { global: 100 },
        status: 'REVIEW',
        createdById: user.id,
      },
    })

    return NextResponse.json({ importId: aiImport.id, result }, { status: 200 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[excel-import]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
