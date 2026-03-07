export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AdminAuthError, requireAdmin } from '@/lib/admin-auth'
import { z } from 'zod'

const updateSchema = z.object({
  isActive: z.boolean().optional(),
  message: z.string().min(1).optional(),
  type: z.enum(['INFO', 'SUCCESS', 'WARNING']).optional(),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()

    const body = await req.json()
    const data = updateSchema.parse(body)

    const announcement = await prisma.announcement.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json(announcement)
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()

    await prisma.announcement.delete({ where: { id: params.id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
