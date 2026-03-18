import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateDPGFStatusSchema } from '@/lib/validations/dpgf'
import { canSeeEstimate } from '@/lib/dpgf-permissions'

export const dynamic = 'force-dynamic'

async function checkDPGFAccess(dpgfId: string, agencyId: string) {
  const dpgf = await prisma.dPGF.findUnique({
    where: { id: dpgfId },
    include: { project: { select: { agencyId: true } } },
  })
  if (!dpgf || dpgf.project.agencyId !== agencyId) return null
  return dpgf
}

export async function GET(
  _req: Request,
  { params }: { params: { dpgfId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const dpgf = await prisma.dPGF.findUnique({
      where: { id: params.dpgfId },
      include: {
        project: {
          select: {
            id: true,
            agencyId: true,
            // Fetch this user's dpgf permission in the same query — no extra round-trip
            permissions: {
              where: { userId: user.id, module: 'dpgf' },
              select: { permissions: true },
            },
          },
        },
        lots: {
          orderBy: { position: 'asc' },
          include: {
            sublots: {
              orderBy: { position: 'asc' },
              include: {
                posts: { orderBy: { position: 'asc' } },
              },
            },
            posts: {
              where: { sublotId: null },
              orderBy: { position: 'asc' },
            },
          },
        },
      },
    })

    if (!dpgf || dpgf.project.agencyId !== user.agencyId!) {
      return NextResponse.json({ error: 'DPGF introuvable' }, { status: 404 })
    }

    // Permission resolved inline — no extra DB query
    const seeEstimate = await canSeeEstimate(dpgf.project.id, user.id, user.role, dpgf.project.permissions[0])

    if (!seeEstimate) {
      const sanitized = {
        ...dpgf,
        lots: dpgf.lots.map((lot) => ({
          ...lot,
          sublots: lot.sublots.map((sl) => ({
            ...sl,
            posts: sl.posts.map((p) => ({ ...p, unitPriceArchi: null })),
          })),
          posts: lot.posts.map((p) => ({ ...p, unitPriceArchi: null })),
        })),
      }
      return NextResponse.json(sanitized, { status: 200 })
    }

    return NextResponse.json(dpgf, { status: 200 })
  } catch (error) {
    console.error('[GET /api/dpgf/[dpgfId]]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { dpgfId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const access = await checkDPGFAccess(params.dpgfId, user.agencyId!)
    if (!access) {
      return NextResponse.json({ error: 'DPGF introuvable' }, { status: 404 })
    }

    const body: unknown = await req.json()
    const parsed = updateDPGFStatusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const dpgf = await prisma.dPGF.update({
      where: { id: params.dpgfId },
      data: { status: parsed.data.status },
    })

    return NextResponse.json(dpgf, { status: 200 })
  } catch (error) {
    console.error('[PATCH /api/dpgf/[dpgfId]]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
