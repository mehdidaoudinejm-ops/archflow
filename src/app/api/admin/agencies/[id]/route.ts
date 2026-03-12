export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AdminAuthError, requireAdmin } from '@/lib/admin-auth'
import { z } from 'zod'

const PLANS = ['SOLO', 'STUDIO', 'AGENCY'] as const

const schema = z.object({
  plan: z.enum(PLANS).optional(),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()

    const body = await req.json()
    const data = schema.parse(body)

    const agency = await prisma.agency.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json(agency)
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[admin/agencies PATCH]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
