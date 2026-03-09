import { NextResponse } from 'next/server'
import { requireRole, AuthError } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { analyzeExcel, analyzePDF } from '@/lib/ai-import'

export const dynamic = 'force-dynamic'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_SIZE = 20 * 1024 * 1024 // 20 Mo

export async function POST(req: Request) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const url = new URL(req.url)
    const dpgfId = url.searchParams.get('dpgfId')
    if (!dpgfId) {
      return NextResponse.json({ error: 'dpgfId manquant' }, { status: 400 })
    }

    // Rate limit : max 5 imports au total par utilisateur
    const totalImports = await prisma.aIImport.count({
      where: { createdById: user.id },
    })
    if (totalImports >= 5) {
      return NextResponse.json(
        { error: 'Limite atteinte. Maximum 5 imports IA par compte.' },
        { status: 429 }
      )
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
      return NextResponse.json({ error: 'Fichier trop volumineux (max 20 Mo)' }, { status: 400 })
    }

    const mimeType = file.type
    const fileName = file.name.toLowerCase()

    const isExcel =
      mimeType.includes('spreadsheet') ||
      mimeType.includes('excel') ||
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls') ||
      fileName.endsWith('.csv')

    const isPDF =
      mimeType === 'application/pdf' || fileName.endsWith('.pdf')

    if (!isExcel && !isPDF) {
      return NextResponse.json(
        { error: 'Format non supporté. Utilisez xlsx, xls, csv ou pdf.' },
        { status: 400 }
      )
    }

    // Créer l'enregistrement AIImport
    const aiImport = await prisma.aIImport.create({
      data: {
        dpgfId,
        originalFilename: file.name,
        fileType: isExcel ? 'excel' : 'pdf',
        aiModel: 'claude-sonnet-4-6',
        status: 'PROCESSING',
        createdById: user.id,
      },
    })

    // Analyser le fichier
    const buffer = Buffer.from(await file.arrayBuffer())
    let result
    try {
      result = isExcel
        ? await analyzeExcel(buffer, file.name)
        : await analyzePDF(buffer, file.name)
    } catch (err) {
      await prisma.aIImport.update({
        where: { id: aiImport.id },
        data: { status: 'FAILED' },
      })
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[ai-import] Erreur analyse:', msg)
      return NextResponse.json(
        { error: `Échec de l'analyse IA : ${msg}` },
        { status: 500 }
      )
    }

    // Mettre à jour avec le résultat
    const updated = await prisma.aIImport.update({
      where: { id: aiImport.id },
      data: {
        rawResponse: result as object,
        confidenceScores: { global: result.globalConfidence },
        status: 'REVIEW',
      },
    })

    return NextResponse.json({ importId: updated.id, result }, { status: 200 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[ai-import]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
