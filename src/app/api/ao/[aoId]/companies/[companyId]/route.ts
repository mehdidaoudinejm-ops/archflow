import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: { aoId: string; companyId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    // Vérifier que l'AO appartient à l'agence
    const ao = await prisma.aO.findUnique({
      where: { id: params.aoId },
      include: {
        dpgf: { include: { project: { select: { agencyId: true } } } },
      },
    })

    if (!ao || ao.dpgf.project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'AO introuvable' }, { status: 404 })
    }

    const aoCompany = await prisma.aOCompany.findUnique({
      where: { id: params.companyId },
      include: {
        offer: { select: { submittedAt: true, isComplete: true } },
        adminDocs: {
          select: { id: true, type: true, status: true, rejectionReason: true, expiresAt: true, fileUrl: true },
          orderBy: { type: 'asc' },
        },
      },
    })

    if (!aoCompany || aoCompany.aoId !== params.aoId) {
      return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 })
    }

    const companyUser = await prisma.user.findUnique({
      where: { id: aoCompany.companyUserId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        agency: {
          select: {
            id: true,
            name: true,
            siret: true,
            siretVerified: true,
            legalForm: true,
            companyAddress: true,
            postalCode: true,
            city: true,
            phone: true,
            trade: true,
            signatoryQuality: true,
          },
        },
      },
    })

    const activityLogs = await prisma.activityLog.findMany({
      where: { userId: aoCompany.companyUserId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, action: true, module: true, createdAt: true, metadata: true },
    })

    return NextResponse.json({
      id: aoCompany.id,
      status: aoCompany.status,
      tokenUsedAt: aoCompany.tokenUsedAt?.toISOString() ?? null,
      offer: aoCompany.offer
        ? {
            submittedAt: aoCompany.offer.submittedAt?.toISOString() ?? null,
            isComplete: aoCompany.offer.isComplete,
          }
        : null,
      adminDocs: aoCompany.adminDocs.map((d) => ({
        id: d.id,
        type: d.type,
        status: d.status,
        rejectionReason: d.rejectionReason,
        expiresAt: d.expiresAt?.toISOString() ?? null,
        fileUrl: d.fileUrl,
      })),
      companyUser: {
        id: companyUser?.id ?? '',
        email: companyUser?.email ?? '',
        firstName: companyUser?.firstName ?? null,
        lastName: companyUser?.lastName ?? null,
        agency: companyUser?.agency ?? null,
      },
      activityLogs: activityLogs.map((l) => ({
        id: l.id,
        action: l.action,
        module: l.module,
        createdAt: l.createdAt.toISOString(),
        metadata: l.metadata,
      })),
    })
  } catch (error) {
    console.error('[GET /api/ao/[aoId]/companies/[companyId]]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
