export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
})

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } })
    if (!user || user.role !== 'CLIENT') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const body = schema.parse(await req.json())

    await prisma.user.update({
      where: { id: user.id },
      data: { firstName: body.firstName, lastName: body.lastName },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[POST /api/client/setup]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
