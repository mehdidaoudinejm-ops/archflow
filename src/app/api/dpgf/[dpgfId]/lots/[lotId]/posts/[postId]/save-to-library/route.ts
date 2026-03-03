import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { saveToLibrarySchema } from '@/lib/validations/library'

export const dynamic = 'force-dynamic'

export async function POST(
  req: Request,
  { params }: { params: { dpgfId: string; lotId: string; postId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const body: unknown = await req.json()
    const parsed = saveToLibrarySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 422 })
    }

    // Verify post → lot → dpgf → agency ownership
    const post = await prisma.post.findUnique({
      where: { id: params.postId },
      include: { lot: { include: { dpgf: { include: { project: true } } } } },
    })
    if (
      !post ||
      post.lotId !== params.lotId ||
      post.lot.dpgfId !== params.dpgfId ||
      post.lot.dpgf.project.agencyId !== user.agencyId
    ) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const item = await prisma.library.create({
      data: {
        agencyId: user.agencyId!,
        title:    post.title,
        unit:     post.unit,
        avgPrice: post.unitPriceArchi ?? null,
        trade:    parsed.data.trade ?? null,
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('[POST /api/dpgf/.../posts/[postId]/save-to-library]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
