import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortalAuth } from '@/lib/portal-auth'
import { AuthError } from '@/lib/auth'

export async function GET(
  req: Request,
  { params }: { params: { aoId: string } }
) {
  try {
    const { aoCompany, companyUser } = await requirePortalAuth(req, params.aoId)

    const ao = await prisma.aO.findUnique({
      where: { id: params.aoId },
      select: {
        id: true,
        name: true,
        deadline: true,
        instructions: true,
        allowCustomQty: true,
        isPaid: true,
        paymentAmount: true,
        status: true,
        lotIds: true,
        dpgfId: true,
        requiredDocs: true,
      },
    })

    if (!ao) return NextResponse.json({ error: 'AO introuvable' }, { status: 404 })

    if (ao.status === 'DRAFT') {
      return NextResponse.json({ error: 'Cet appel d\'offre n\'est pas encore ouvert' }, { status: 403 })
    }

    // Récupérer les lots inclus dans l'AO (sans estimatif archi)
    const lots = await prisma.lot.findMany({
      where: { id: { in: ao.lotIds }, dpgfId: ao.dpgfId },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        number: true,
        name: true,
        posts: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            ref: true,
            title: true,
            unit: true,
            qtyArchi: true,
            isOptional: true,
            commentArchi: true,
            position: true,
            sublotId: true,
            // unitPriceArchi est délibérément ABSENT
          },
        },
      },
    })

    // Récupérer l'offre en cours de l'entreprise
    const offer = await prisma.offer.findFirst({
      where: { aoCompanyId: aoCompany.id },
      select: {
        id: true,
        submittedAt: true,
        isComplete: true,
        offerPosts: {
          select: {
            id: true,
            postId: true,
            unitPrice: true,
            qtyCompany: true,
            qtyMotive: true,
            comment: true,
            isVariant: true,
            variantDescription: true,
          },
        },
      },
    })

    // Marquer comme "ouvert" si première visite
    if (aoCompany.status === 'INVITED') {
      await prisma.aOCompany.update({
        where: { id: aoCompany.id },
        data: { status: 'OPENED' },
      })
    }

    return NextResponse.json(
      {
        ao: {
          id: ao.id,
          name: ao.name,
          deadline: ao.deadline,
          instructions: ao.instructions,
          allowCustomQty: ao.allowCustomQty,
          isPaid: ao.isPaid,
          paymentAmount: ao.paymentAmount,
          status: ao.status,
          lotIds: ao.lotIds,
          requiredDocs: ao.requiredDocs,
        },
        lots,
        offer,
        companyUser: {
          id: companyUser.id,
          email: companyUser.email,
          firstName: companyUser.firstName,
          lastName: companyUser.lastName,
          companyName: companyUser.agency?.name ?? null,
        },
        aoCompanyId: aoCompany.id,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[GET /api/portal/[aoId]]', error)
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
