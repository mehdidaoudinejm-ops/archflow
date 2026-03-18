import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resendInvite } from '@/lib/invite'

export const dynamic = 'force-dynamic'

export async function POST(
  _req: Request,
  { params }: { params: { aoId: string; companyId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const ao = await prisma.aO.findUnique({
      where: { id: params.aoId },
      include: { dpgf: { include: { project: { select: { agencyId: true, name: true } } } } },
    })

    if (!ao || ao.dpgf.project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'AO introuvable' }, { status: 404 })
    }

    const aoCompany = await prisma.aOCompany.findUnique({
      where: { id: params.companyId },
    })

    if (!aoCompany || aoCompany.aoId !== params.aoId) {
      return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 })
    }

    await resendInvite({
      aoCompanyId: params.companyId,
      agencyName: user.agency?.name ?? 'ArchFlow',
      aoName: ao.name,
      projectName: ao.dpgf.project.name,
      deadline: ao.deadline,
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('[POST /api/ao/[aoId]/companies/[companyId]/resend]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
