import { NextResponse } from 'next/server'
import { requireRole, AuthError } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ImportedLot } from '@/lib/ai-import'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  { params }: { params: { importId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const aiImport = await prisma.aIImport.findFirst({
      where: {
        id: params.importId,
        dpgf: { project: { agencyId: user.agencyId! } },
      },
    })

    if (!aiImport) {
      return NextResponse.json({ error: 'Import introuvable' }, { status: 404 })
    }

    return NextResponse.json(aiImport, { status: 200 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[ai-import/get]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: { importId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const aiImport = await prisma.aIImport.findFirst({
      where: {
        id: params.importId,
        dpgf: { project: { agencyId: user.agencyId! } },
      },
    })

    if (!aiImport) {
      return NextResponse.json({ error: 'Import introuvable' }, { status: 404 })
    }

    if (aiImport.status === 'IMPORTED') {
      return NextResponse.json({ error: 'Déjà importé' }, { status: 409 })
    }

    const body = (await req.json()) as { lots: ImportedLot[] }
    if (!Array.isArray(body.lots)) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }

    // Insérer les lots, sous-lots et postes dans la DPGF
    let lotPosition = 0
    for (const importedLot of body.lots) {
      lotPosition++
      const lot = await prisma.lot.create({
        data: {
          dpgfId: aiImport.dpgfId,
          number: lotPosition,
          name: importedLot.name,
          position: lotPosition,
        },
      })

      // Postes directs rattachés au lot (structure plate sans sous-lots)
      let directPostPos = 0
      for (const importedPost of (importedLot.posts ?? [])) {
        directPostPos++
        const ref =
          importedPost.ref ??
          `${String(lotPosition).padStart(2, '0')}.${String(directPostPos).padStart(2, '0')}`
        await prisma.post.create({
          data: {
            lotId: lot.id,
            ref,
            title: importedPost.title,
            unit: importedPost.unit || 'u',
            qtyArchi: importedPost.qty ?? undefined,
            unitPriceArchi: importedPost.unit_price ?? undefined,
            position: directPostPos,
          },
        })
      }

      // Sous-lots
      let sublotPos = 0
      for (const importedSubLot of (importedLot.sublots ?? [])) {
        sublotPos++
        const sublot = await prisma.subLot.create({
          data: {
            lotId: lot.id,
            number: importedSubLot.number,
            name: importedSubLot.name,
            position: sublotPos,
          },
        })

        let subPostPos = 0
        for (const importedPost of importedSubLot.posts) {
          subPostPos++
          const ref = importedPost.ref ?? `${importedSubLot.number}.${subPostPos}`
          await prisma.post.create({
            data: {
              lotId: lot.id,
              sublotId: sublot.id,
              ref,
              title: importedPost.title,
              unit: importedPost.unit || 'u',
              qtyArchi: importedPost.qty ?? undefined,
              unitPriceArchi: importedPost.unit_price ?? undefined,
              position: subPostPos,
            },
          })
        }
      }
    }

    // Marquer l'import comme terminé
    await prisma.aIImport.update({
      where: { id: aiImport.id },
      data: { status: 'IMPORTED' },
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[ai-import/apply]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
