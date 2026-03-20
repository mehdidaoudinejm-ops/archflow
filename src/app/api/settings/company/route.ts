import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  companyName: z.string().min(1).max(200),
  firstName: z.string().max(100).optional().nullable(),
  lastName: z.string().max(100).optional().nullable(),
  siret: z.string().max(14).optional().nullable(),
  legalForm: z.string().max(100).optional().nullable(),
  companyAddress: z.string().max(200).optional().nullable(),
  postalCode: z.string().max(10).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  trade: z.string().max(100).optional().nullable(),
  signatoryQuality: z.string().max(100).optional().nullable(),
})

export async function PATCH(req: Request) {
  try {
    const user = await requireRole(['COMPANY'])

    const body: unknown = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 422 })
    }

    const { companyName, firstName, lastName, siret, legalForm, companyAddress, postalCode, city, country, phone, trade, signatoryQuality } = parsed.data

    if (firstName !== undefined || lastName !== undefined) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(firstName !== undefined ? { firstName: firstName ?? null } : {}),
          ...(lastName !== undefined ? { lastName: lastName ?? null } : {}),
        },
      })
    }

    if (!user.agencyId) {
      // Company user without agency — create one
      const agency = await prisma.agency.create({
        data: {
          name: companyName,
          siret: siret ?? undefined,
          legalForm: legalForm ?? undefined,
          companyAddress: companyAddress ?? undefined,
          postalCode: postalCode ?? undefined,
          city: city ?? undefined,
          country: country ?? 'France',
          phone: phone ?? undefined,
          trade: trade ?? undefined,
          signatoryQuality: signatoryQuality ?? undefined,
          activeModules: [],
        },
      })
      await prisma.user.update({ where: { id: user.id }, data: { agencyId: agency.id } })
    } else {
      await prisma.agency.update({
        where: { id: user.agencyId },
        data: {
          name: companyName,
          siret: siret ?? undefined,
          legalForm: legalForm ?? undefined,
          companyAddress: companyAddress ?? undefined,
          postalCode: postalCode ?? undefined,
          city: city ?? undefined,
          country: country ?? undefined,
          phone: phone ?? undefined,
          trade: trade ?? undefined,
          signatoryQuality: signatoryQuality ?? undefined,
          // Reset verification si SIRET modifié
          ...(siret !== undefined ? { siretVerified: false, dirigeantNom: null, dirigeantPrenoms: null } : {}),
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[PATCH /api/settings/company]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
