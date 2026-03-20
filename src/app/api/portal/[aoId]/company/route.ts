import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortalAuth } from '@/lib/portal-auth'
import { AuthError } from '@/lib/auth'
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

export async function PATCH(
  req: Request,
  { params }: { params: { aoId: string } }
) {
  try {
    const { companyUser } = await requirePortalAuth(req, params.aoId)

    const body: unknown = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 422 })
    }

    const { companyName, firstName, lastName, siret, legalForm, companyAddress, postalCode, city, country, phone, trade, signatoryQuality } = parsed.data

    // Mettre à jour le nom du signataire sur l'utilisateur
    if (firstName !== undefined || lastName !== undefined) {
      await prisma.user.update({
        where: { id: companyUser.id },
        data: {
          ...(firstName !== undefined ? { firstName: firstName ?? null } : {}),
          ...(lastName !== undefined ? { lastName: lastName ?? null } : {}),
        },
      })
    }

    if (!companyUser.agencyId) {
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
      await prisma.user.update({ where: { id: companyUser.id }, data: { agencyId: agency.id } })
    } else {
      const currentAgency = await prisma.agency.findUnique({
        where: { id: companyUser.agencyId },
        select: { siret: true },
      })
      const siretChanged = siret !== undefined && siret !== (currentAgency?.siret ?? null)

      await prisma.agency.update({
        where: { id: companyUser.agencyId },
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
          ...(siretChanged ? { siretVerified: false, dirigeantNom: null, dirigeantPrenoms: null } : {}),
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    console.error('[PATCH /api/portal/[aoId]/company]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
