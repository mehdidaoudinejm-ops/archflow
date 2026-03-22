import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeRef } from '@/lib/dpgf-numbering'

export const dynamic = 'force-dynamic'

interface GeneratedPost {
  title: string
  unit: string
  qty: null
  unit_price: null
  custom: boolean
}

interface GeneratedSubLot {
  number: string
  name: string
  posts: GeneratedPost[]
}

interface GeneratedLot {
  name: string
  sublots: GeneratedSubLot[]
  posts: GeneratedPost[]
}

async function checkDPGFAccess(dpgfId: string, agencyId: string) {
  const dpgf = await prisma.dPGF.findUnique({
    where: { id: dpgfId },
    include: { project: { select: { agencyId: true } } },
  })
  if (!dpgf || dpgf.project.agencyId !== agencyId) return null
  return dpgf
}

export async function POST(
  req: Request,
  { params }: { params: { dpgfId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const access = await checkDPGFAccess(params.dpgfId, user.agencyId!)
    if (!access) {
      return NextResponse.json({ error: 'DPGF introuvable' }, { status: 404 })
    }

    const body = await req.json() as { lots: GeneratedLot[] }
    const { lots } = body

    if (!Array.isArray(lots)) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 422 })
    }

    const dpgfId = params.dpgfId

    // Get existing lots to compute next number/position
    const existingLots = await prisma.lot.findMany({
      where: { dpgfId },
      select: { number: true, position: true },
    })

    let nextLotNumber =
      existingLots.length > 0
        ? Math.max(...existingLots.map((l) => l.number)) + 1
        : 1
    let nextLotPosition =
      existingLots.length > 0
        ? Math.max(...existingLots.map((l) => l.position)) + 1
        : 0

    let createdLots = 0
    let createdSublots = 0
    let createdPosts = 0

    for (const genLot of lots) {
      const lotName = genLot.name?.trim() || 'Lot sans nom'

      const lot = await prisma.lot.create({
        data: {
          dpgfId,
          name: lotName,
          number: nextLotNumber,
          position: nextLotPosition,
        },
      })
      createdLots++
      nextLotNumber++
      nextLotPosition++

      // Direct posts (no sublot)
      for (let i = 0; i < genLot.posts.length; i++) {
        const genPost = genLot.posts[i]
        const pos = i + 1
        await prisma.post.create({
          data: {
            lotId: lot.id,
            sublotId: null,
            ref: computeRef(lot.number, pos),
            title: genPost.title?.trim() || 'Poste sans titre',
            unit: genPost.unit?.trim() || 'u',
            qtyArchi: null,
            unitPriceArchi: null,
            isOptional: false,
            position: pos,
          },
        })
        createdPosts++
      }

      // Sublots and their posts
      for (let si = 0; si < genLot.sublots.length; si++) {
        const genSublot = genLot.sublots[si]
        const sublotNumber = String(si + 1)

        const sublot = await prisma.subLot.create({
          data: {
            lotId: lot.id,
            number: sublotNumber,
            name: genSublot.name?.trim() || 'Sous-lot sans nom',
            position: si,
          },
        })
        createdSublots++

        for (let pi = 0; pi < genSublot.posts.length; pi++) {
          const genPost = genSublot.posts[pi]
          const pos = pi + 1
          await prisma.post.create({
            data: {
              lotId: lot.id,
              sublotId: sublot.id,
              ref: computeRef(lot.number, pos, sublotNumber),
              title: genPost.title?.trim() || 'Poste sans titre',
              unit: genPost.unit?.trim() || 'u',
              qtyArchi: null,
              unitPriceArchi: null,
              isOptional: false,
              position: pos,
            },
          })
          createdPosts++
        }
      }
    }

    console.log(
      `[ai-generate/apply] Inséré : ${createdLots} lot(s), ${createdSublots} sous-lot(s), ${createdPosts} poste(s)`
    )

    return NextResponse.json(
      { created: { lots: createdLots, sublots: createdSublots, posts: createdPosts } },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/dpgf/[dpgfId]/ai-generate/apply]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
