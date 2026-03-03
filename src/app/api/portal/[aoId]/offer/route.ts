import { NextResponse } from 'next/server'
import { createElement } from 'react'
import { prisma } from '@/lib/prisma'
import { requirePortalAuth } from '@/lib/portal-auth'
import { AuthError } from '@/lib/auth'
import { saveOfferSchema } from '@/lib/validations/offer'
import { sendEmail } from '@/lib/email'
import { OfferReceivedEmail } from '@/emails/OfferReceivedEmail'

// GET — Récupérer ou créer l'offre en cours
export async function GET(
  req: Request,
  { params }: { params: { aoId: string } }
) {
  try {
    const { aoCompany } = await requirePortalAuth(req, params.aoId)

    const offer = await prisma.offer.findFirst({
      where: { aoCompanyId: aoCompany.id },
      include: { offerPosts: true },
    })

    return NextResponse.json(offer, { status: 200 })
  } catch (error) {
    console.error('[GET /api/portal/[aoId]/offer]', error)
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH — Autosave (crée l'offre si nécessaire, upsert les postes)
export async function PATCH(
  req: Request,
  { params }: { params: { aoId: string } }
) {
  try {
    const { aoCompany } = await requirePortalAuth(req, params.aoId)

    // Vérifier que l'AO est encore ouvert
    const ao = await prisma.aO.findUnique({
      where: { id: params.aoId },
      select: { status: true },
    })
    if (!ao || ao.status === 'CLOSED' || ao.status === 'ARCHIVED') {
      return NextResponse.json({ error: 'Cet AO est clôturé' }, { status: 400 })
    }

    const body: unknown = await req.json()
    const parsed = saveOfferSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    // Créer l'offre si elle n'existe pas encore
    let offer = await prisma.offer.findFirst({ where: { aoCompanyId: aoCompany.id } })
    if (!offer) {
      offer = await prisma.offer.create({
        data: { aoId: params.aoId, aoCompanyId: aoCompany.id },
      })
    }

    // Vérifier que l'offre n'est pas déjà soumise
    if (offer.isComplete) {
      return NextResponse.json({ error: 'L\'offre a déjà été soumise' }, { status: 400 })
    }

    // Upsert des postes
    for (const post of parsed.data.posts) {
      const existing = await prisma.offerPost.findFirst({
        where: { offerId: offer.id, postId: post.postId },
      })

      if (existing) {
        await prisma.offerPost.update({
          where: { id: existing.id },
          data: {
            unitPrice: post.unitPrice ?? null,
            qtyCompany: post.qtyCompany ?? null,
            qtyMotive: post.qtyMotive ?? null,
            comment: post.comment ?? null,
            isVariant: post.isVariant ?? false,
            variantDescription: post.variantDescription ?? null,
          },
        })
      } else {
        await prisma.offerPost.create({
          data: {
            offerId: offer.id,
            postId: post.postId,
            unitPrice: post.unitPrice ?? null,
            qtyCompany: post.qtyCompany ?? null,
            qtyMotive: post.qtyMotive ?? null,
            comment: post.comment ?? null,
            isVariant: post.isVariant ?? false,
            variantDescription: post.variantDescription ?? null,
          },
        })
      }
    }

    // Mettre à jour le statut AOCompany
    if (aoCompany.status === 'INVITED' || aoCompany.status === 'OPENED') {
      await prisma.aOCompany.update({
        where: { id: aoCompany.id },
        data: { status: 'IN_PROGRESS' },
      })
    }

    return NextResponse.json({ success: true, offerId: offer.id }, { status: 200 })
  } catch (error) {
    console.error('[PATCH /api/portal/[aoId]/offer]', error)
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT — Soumettre l'offre définitivement
export async function PUT(
  req: Request,
  { params }: { params: { aoId: string } }
) {
  try {
    const { aoCompany, companyUser } = await requirePortalAuth(req, params.aoId)

    const ao = await prisma.aO.findUnique({
      where: { id: params.aoId },
      include: {
        dpgf: {
          include: {
            project: { select: { name: true, agencyId: true } },
          },
        },
      },
    })

    if (!ao || ao.status === 'CLOSED' || ao.status === 'ARCHIVED') {
      return NextResponse.json({ error: 'Cet AO est clôturé' }, { status: 400 })
    }

    // Vérifier les documents administratifs obligatoires
    if (Array.isArray(ao.requiredDocs)) {
      type RequiredDocItem = { type: string; label: string; required: boolean }
      const mandatoryTypes = (ao.requiredDocs as RequiredDocItem[])
        .filter((d) => d.required)
        .map((d) => d.type)

      if (mandatoryTypes.length > 0) {
        const uploadedDocs = await prisma.adminDoc.findMany({
          where: { aoCompanyId: aoCompany.id, status: { in: ['PENDING', 'VALID'] } },
          select: { type: true },
        })
        const uploadedTypes = new Set(uploadedDocs.map((d) => d.type))
        const missingDocs = mandatoryTypes.filter((t) => !uploadedTypes.has(t))
        if (missingDocs.length > 0) {
          const docLabels = (ao.requiredDocs as RequiredDocItem[])
            .filter((d) => missingDocs.includes(d.type))
            .map((d) => d.label)
          return NextResponse.json(
            { error: 'Documents administratifs manquants', details: docLabels },
            { status: 422 }
          )
        }
      }
    }

    const body: unknown = await req.json()
    const parsed = saveOfferSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    // Récupérer tous les postes de l'AO pour validation
    const lots = await prisma.lot.findMany({
      where: { id: { in: ao.lotIds }, dpgfId: ao.dpgfId },
      select: {
        posts: { select: { id: true, isOptional: true, ref: true, title: true } },
      },
    })
    const allPosts = lots.flatMap((l) => l.posts)

    // Valider que tous les postes obligatoires ont un prix
    const postsMap = new Map(parsed.data.posts.map((p) => [p.postId, p]))
    const missingPrices: string[] = []

    for (const post of allPosts) {
      if (post.isOptional) continue
      const offerPost = postsMap.get(post.id)
      const isSkipped = offerPost?.comment === '__SKIP__'
      if (!isSkipped && (offerPost?.unitPrice === null || offerPost?.unitPrice === undefined)) {
        missingPrices.push(`${post.ref} — ${post.title}`)
      }
    }

    if (missingPrices.length > 0) {
      return NextResponse.json(
        {
          error: 'Prix manquants sur des postes obligatoires',
          details: missingPrices,
        },
        { status: 422 }
      )
    }

    // Créer / mettre à jour l'offre
    let offer = await prisma.offer.findFirst({ where: { aoCompanyId: aoCompany.id } })
    if (!offer) {
      offer = await prisma.offer.create({
        data: { aoId: params.aoId, aoCompanyId: aoCompany.id },
      })
    }

    if (offer.isComplete) {
      return NextResponse.json({ error: 'L\'offre a déjà été soumise' }, { status: 400 })
    }

    // Sauvegarder tous les postes
    for (const post of parsed.data.posts) {
      const existing = await prisma.offerPost.findFirst({
        where: { offerId: offer.id, postId: post.postId },
      })
      const data = {
        unitPrice: post.unitPrice ?? null,
        qtyCompany: post.qtyCompany ?? null,
        qtyMotive: post.qtyMotive ?? null,
        comment: post.comment ?? null,
        isVariant: post.isVariant ?? false,
        variantDescription: post.variantDescription ?? null,
      }
      if (existing) {
        await prisma.offerPost.update({ where: { id: existing.id }, data })
      } else {
        await prisma.offerPost.create({
          data: { offerId: offer.id, postId: post.postId, ...data },
        })
      }
    }

    // Marquer l'offre comme soumise
    await prisma.offer.update({
      where: { id: offer.id },
      data: { submittedAt: new Date(), isComplete: true },
    })

    // Mettre à jour le statut de l'entreprise
    await prisma.aOCompany.update({
      where: { id: aoCompany.id },
      data: { status: 'SUBMITTED' },
    })

    // Notifier les architectes de l'agence
    const architects = await prisma.user.findMany({
      where: { agencyId: ao.dpgf.project.agencyId, role: { in: ['ARCHITECT', 'COLLABORATOR'] } },
      select: { email: true, firstName: true },
    })

    const companyName =
      companyUser.agency?.name ??
      [companyUser.firstName, companyUser.lastName].filter(Boolean).join(' ') ??
      companyUser.email

    for (const architect of architects) {
      try {
        await sendEmail({
          to: architect.email,
          subject: `Nouvelle offre reçue — ${ao.name}`,
          react: createElement(OfferReceivedEmail, {
            architectName: architect.firstName ?? 'Architecte',
            companyName,
            aoName: ao.name,
            projectName: ao.dpgf.project.name,
          }),
        })
      } catch (emailErr) {
        console.error('[PUT /api/portal/offer] email error', emailErr)
      }
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('[PUT /api/portal/[aoId]/offer]', error)
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
