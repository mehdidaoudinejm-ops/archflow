export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { AdminAuthError, requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/admin/backfill-annuaire
 * Pour chaque AOCompany inscrite (tokenUsedAt renseigné), crée le contact ENTREPRISE
 * dans l'annuaire de l'architecte s'il est absent.
 */
export async function POST() {
  try {
    await requireAdmin()

    const aoCompanies = await prisma.aOCompany.findMany({
      where: { tokenUsedAt: { not: null } },
      include: {
        ao: {
          include: {
            dpgf: { include: { project: { select: { agencyId: true } } } },
          },
        },
      },
    })

    let created = 0
    let skipped = 0
    let errors = 0

    for (const aoc of aoCompanies) {
      try {
        const architectAgencyId = aoc.ao?.dpgf?.project?.agencyId
        if (!architectAgencyId) { skipped++; continue }

        const user = await prisma.user.findUnique({
          where: { id: aoc.companyUserId },
          include: { agency: true },
        })
        if (!user) { skipped++; continue }

        const existing = await prisma.contact.findFirst({
          where: { agencyId: architectAgencyId, email: user.email, type: 'ENTREPRISE' },
        })
        if (existing) { skipped++; continue }

        await prisma.contact.create({
          data: {
            agencyId: architectAgencyId,
            type: 'ENTREPRISE',
            firstName: user.firstName ?? user.agency?.name ?? 'Inconnu',
            lastName: user.lastName ?? null,
            email: user.email,
            phone: user.agency?.phone ?? null,
            company: user.agency?.name ?? null,
            address: [user.agency?.companyAddress, user.agency?.postalCode, user.agency?.city]
              .filter(Boolean).join(', ') || null,
            notes: user.agency?.siret ? `SIRET: ${user.agency.siret}` : null,
          },
        })
        created++
      } catch {
        errors++
      }
    }

    return NextResponse.json({ total: aoCompanies.length, created, skipped, errors })
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[POST /api/admin/backfill-annuaire]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
