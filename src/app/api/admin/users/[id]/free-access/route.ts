import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({ freeAccess: z.boolean() })

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin()
    if (!session) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const body: unknown = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 422 })

    await prisma.user.update({
      where: { id: params.id },
      data: { freeAccess: parsed.data.freeAccess },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[PATCH /api/admin/users/[id]/free-access]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
