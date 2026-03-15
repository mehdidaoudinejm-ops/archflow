import { NextResponse } from 'next/server'
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const patchSchema = z.object({
  validated: z.boolean().optional(),
  lot: z.string().min(1).optional(),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()
    const body = patchSchema.parse(await req.json())
    const item = await prisma.libraryItem.update({
      where: { id: params.id },
      data: body,
    })
    return NextResponse.json(item)
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[PATCH /api/admin/library/[id]]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()
    await prisma.libraryItem.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[DELETE /api/admin/library/[id]]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
