export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await requireRole(['COMPANY'])

    const aoCompanies = await prisma.aOCompany.findMany({
      where: { companyUserId: user.id },
      include: {
        ao: {
          include: {
            dpgf: {
              include: {
                project: {
                  select: { name: true, address: true },
                },
              },
            },
          },
        },
        offer: {
          select: { id: true, submittedAt: true, isComplete: true },
        },
      },
      orderBy: { ao: { createdAt: 'desc' } },
    })

    return NextResponse.json(aoCompanies)
  } catch (error) {
    console.error('[GET /api/company/aos]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: (error as { message: string }).message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
