import { NextResponse } from 'next/server'
import { requireRole, AuthError } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { DPGFModifiedEmail } from '@/emails/DPGFModifiedEmail'
import { logActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

async function checkDPGFAccess(dpgfId: string, agencyId: string) {
  const dpgf = await prisma.dPGF.findUnique({
    where: { id: dpgfId },
    include: { project: { select: { agencyId: true, name: true } } },
  })
  if (!dpgf || dpgf.project.agencyId !== agencyId) return null
  return dpgf
}

export async function POST(
  _req: Request,
  { params }: { params: { dpgfId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const dpgf = await checkDPGFAccess(params.dpgfId, user.agencyId!)
    if (!dpgf) {
      return NextResponse.json({ error: 'DPGF introuvable' }, { status: 404 })
    }

    if (dpgf.status !== 'AO_SENT') {
      return NextResponse.json({ error: 'Le DPGF n\'est pas verrouillé' }, { status: 400 })
    }

    const projectName = dpgf.project.name

    // Récupérer les AOs actifs pour les emails (avant la transaction)
    const activeAos = await prisma.aO.findMany({
      where: { dpgfId: params.dpgfId, status: { notIn: ['ARCHIVED', 'CLOSED'] } },
      select: {
        id: true,
        name: true,
        aoCompanies: {
          select: {
            id: true,
            companyUserId: true,
            inviteToken: true,
            offer: { select: { id: true } },
          },
        },
      },
    })

    // Transaction : reset offres + DPGF → DRAFT
    await prisma.$transaction(async (tx) => {
      for (const ao of activeAos) {
        for (const company of ao.aoCompanies) {
          if (company.offer) {
            await tx.offerPost.deleteMany({ where: { offerId: company.offer.id } })
            await tx.offer.update({
              where: { id: company.offer.id },
              data: { isComplete: false, submittedAt: null },
            })
          }
          await tx.aOCompany.update({
            where: { id: company.id },
            data: { status: 'IN_PROGRESS' },
          })
        }
      }
      await tx.dPGF.update({
        where: { id: params.dpgfId },
        data: { status: 'DRAFT' },
      })
    })

    // Envoyer emails aux entreprises
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const companyUserIds = Array.from(
      new Set(activeAos.flatMap((ao) => ao.aoCompanies.map((c) => c.companyUserId)))
    )
    const companyUsers = await prisma.user.findMany({
      where: { id: { in: companyUserIds } },
      select: { id: true, email: true },
    })
    const userEmailMap = new Map(companyUsers.map((u) => [u.id, u.email]))

    for (const ao of activeAos) {
      for (const company of ao.aoCompanies) {
        const email = userEmailMap.get(company.companyUserId)
        if (!email) continue
        const portalUrl = company.inviteToken
          ? `${appUrl}/portal/${ao.id}?token=${company.inviteToken}`
          : `${appUrl}/portal/${ao.id}`
        await sendEmail({
          to: email,
          subject: `Le DQE du projet ${projectName} a été mis à jour`,
          html: DPGFModifiedEmail({ projectName, aoName: ao.name, portalUrl }),
        })
      }
    }

    await logActivity({
      userId:    user.id,
      module:    'dpgf',
      action:    'unlock_dpgf',
      projectId: dpgf.projectId,
      metadata:  { dpgfId: params.dpgfId, projectName, companiesNotified: companyUserIds.length },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('[POST /api/dpgf/[dpgfId]/unlock]', error instanceof Error ? error.message : error)
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
