export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const updateSchema = z.object({
  companyName: z.string().min(1).max(100).optional(),
  companyAddress: z.string().max(200).optional(),
  postalCode: z.string().max(10).optional(),
  city: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  trade: z.string().max(50).optional(),
  signatoryQuality: z.string().max(50).optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
})

export async function GET() {
  try {
    const user = await requireRole(['COMPANY'])
    const agency = user.agencyId
      ? await prisma.agency.findUnique({ where: { id: user.agencyId } })
      : null
    return NextResponse.json({ user, agency })
  } catch (error) {
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: (error as { message: string }).message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireRole(['COMPANY'])
    const body: unknown = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 422 })
    }

    const { companyName, ...agencyFields } = parsed.data

    if (user.agencyId) {
      await prisma.agency.update({
        where: { id: user.agencyId },
        data: {
          ...(companyName ? { name: companyName } : {}),
          ...agencyFields,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: (error as { message: string }).message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
