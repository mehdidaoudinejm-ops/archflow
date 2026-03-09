import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPostSchema } from '@/lib/validations/dpgf'
import { canSeeEstimate } from '@/lib/dpgf-permissions'

export const dynamic = 'force-dynamic'

async function checkLotAccess(dpgfId: string, lotId: string, agencyId: string) {
  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: {
      dpgf: { include: { project: { select: { id: true, agencyId: true } } } },
    },
  })
  if (!lot || lot.dpgfId !== dpgfId || lot.dpgf.project.agencyId !== agencyId) return null
  return lot
}

function computeRef(lotNumber: number, position: number, sublotNumber?: string): string {
  const ln = lotNumber.toString().padStart(2, '0')
  const pn = position.toString().padStart(2, '0')
  if (sublotNumber) {
    return `${ln}.${sublotNumber}.${pn}`
  }
  return `${ln}.${pn}`
}

export async function GET(
  _req: Request,
  { params }: { params: { dpgfId: string; lotId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const lot = await checkLotAccess(params.dpgfId, params.lotId, user.agencyId!)
    if (!lot) {
      return NextResponse.json({ error: 'Lot introuvable' }, { status: 404 })
    }

    const posts = await prisma.post.findMany({
      where: { lotId: params.lotId },
      orderBy: { position: 'asc' },
    })

    const seeEstimate = await canSeeEstimate(lot.dpgf.project.id, user.id, user.role)
    const result = seeEstimate ? posts : posts.map((p) => ({ ...p, unitPriceArchi: null }))

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('[GET /api/dpgf/[dpgfId]/lots/[lotId]/posts]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: { dpgfId: string; lotId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const lot = await checkLotAccess(params.dpgfId, params.lotId, user.agencyId!)
    if (!lot) {
      return NextResponse.json({ error: 'Lot introuvable' }, { status: 404 })
    }

    const body: unknown = await req.json()
    const parsed = createPostSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    // Calculer la prochaine position dans ce lot (ou sous-lot)
    const whereClause = parsed.data.sublotId
      ? { lotId: params.lotId, sublotId: parsed.data.sublotId }
      : { lotId: params.lotId, sublotId: null }

    const lastPost = await prisma.post.findFirst({
      where: whereClause,
      orderBy: { position: 'desc' },
      select: { position: true },
    })
    const nextPosition = lastPost ? lastPost.position + 1 : 1

    // Récupérer le numéro du sous-lot si applicable
    let sublotNumber: string | undefined
    if (parsed.data.sublotId) {
      const sublot = await prisma.subLot.findUnique({
        where: { id: parsed.data.sublotId },
        select: { number: true },
      })
      sublotNumber = sublot?.number
    }

    const ref = computeRef(lot.number, nextPosition, sublotNumber)

    const post = await prisma.post.create({
      data: {
        lotId: params.lotId,
        sublotId: parsed.data.sublotId ?? null,
        title: parsed.data.title,
        unit: parsed.data.unit,
        qtyArchi: parsed.data.qtyArchi ?? null,
        unitPriceArchi: parsed.data.unitPriceArchi ?? null,
        isOptional: parsed.data.isOptional ?? false,
        commentArchi: parsed.data.commentArchi ?? null,
        libraryRefId: parsed.data.libraryRefId ?? null,
        ref,
        position: nextPosition,
      },
    })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error('[POST /api/dpgf/[dpgfId]/lots/[lotId]/posts]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
