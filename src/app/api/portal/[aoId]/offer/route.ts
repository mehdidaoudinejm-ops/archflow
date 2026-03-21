import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortalAuth } from '@/lib/portal-auth'
import { AuthError } from '@/lib/auth'
import { saveOfferSchema } from '@/lib/validations/offer'
import { sendEmail } from '@/lib/email'
import { OfferReceivedEmail } from '@/emails/OfferReceivedEmail'

export const dynamic = 'force-dynamic'

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

    // Upsert des postes (batch — une seule requête de lecture + transaction)
    const postIds = parsed.data.posts.map((p) => p.postId)
    const existingPosts = await prisma.offerPost.findMany({
      where: { offerId: offer.id, postId: { in: postIds } },
      select: { id: true, postId: true },
    })
    const existingMap = new Map(existingPosts.map((p) => [p.postId, p.id]))

    await prisma.$transaction(
      parsed.data.posts.map((post) => {
        const existingId = existingMap.get(post.postId)
        const data = {
          unitPrice: post.unitPrice ?? null,
          qtyCompany: post.qtyCompany ?? null,
          qtyMotive: post.qtyMotive ?? null,
          comment: post.comment ?? null,
          isVariant: post.isVariant ?? false,
          variantDescription: post.variantDescription ?? null,
        }
        return existingId
          ? prisma.offerPost.update({ where: { id: existingId }, data })
          : prisma.offerPost.create({ data: { offerId: offer.id, postId: post.postId, ...data } })
      })
    )

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
            project: { select: { id: true, name: true, agencyId: true } },
          },
        },
      },
    })

    if (!ao || ao.status === 'CLOSED' || ao.status === 'ARCHIVED') {
      return NextResponse.json({ error: 'Cet AO est clôturé' }, { status: 400 })
    }

    // Vérifier que le profil entreprise est complet
    const companyAgency = await prisma.agency.findFirst({
      where: { users: { some: { id: companyUser.id } } },
      select: { name: true, siret: true, phone: true, trade: true, companyAddress: true, city: true },
    })
    if (!companyAgency?.name || !companyAgency?.siret || !companyAgency?.phone || !companyAgency?.trade || !companyAgency?.companyAddress || !companyAgency?.city) {
      return NextResponse.json(
        { error: 'Profil entreprise incomplet. Complétez votre profil avant de soumettre votre offre.' },
        { status: 422 }
      )
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

    // Récupérer la sélection de lots de l'entreprise
    const aoCompanyWithLots = await prisma.aOCompany.findUnique({
      where: { id: aoCompany.id },
      select: { selectedLotIds: true },
    })
    const selectedLotIds = aoCompanyWithLots?.selectedLotIds ?? []
    const lotIdsToValidate = selectedLotIds.length > 0 ? selectedLotIds : ao.lotIds

    // Récupérer les postes des lots retenus uniquement
    const lots = await prisma.lot.findMany({
      where: { id: { in: lotIdsToValidate }, dpgfId: ao.dpgfId },
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

    // Prix manquants : on accepte la soumission, ils apparaîtront comme non proposés dans l'analyse
    if (missingPrices.length > 0) {
      console.info(`[offer/submit] ${missingPrices.length} postes sans prix acceptés pour aoCompanyId=${aoCompany.id}`)
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

    // Sauvegarder tous les postes (batch)
    const submitPostIds = parsed.data.posts.map((p) => p.postId)
    const existingSubmitPosts = await prisma.offerPost.findMany({
      where: { offerId: offer.id, postId: { in: submitPostIds } },
      select: { id: true, postId: true },
    })
    const submitExistingMap = new Map(existingSubmitPosts.map((p) => [p.postId, p.id]))

    await prisma.$transaction(
      parsed.data.posts.map((post) => {
        const existingId = submitExistingMap.get(post.postId)
        const data = {
          unitPrice: post.unitPrice ?? null,
          qtyCompany: post.qtyCompany ?? null,
          qtyMotive: post.qtyMotive ?? null,
          comment: post.comment ?? null,
          isVariant: post.isVariant ?? false,
          variantDescription: post.variantDescription ?? null,
        }
        return existingId
          ? prisma.offerPost.update({ where: { id: existingId }, data })
          : prisma.offerPost.create({ data: { offerId: offer.id, postId: post.postId, ...data } })
      })
    )

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

    const companyName =
      companyUser.agency?.name ??
      [companyUser.firstName, companyUser.lastName].filter(Boolean).join(' ') ??
      companyUser.email

    // Notifier les architectes — une seule requête pour emails + notifications
    const architects = await prisma.user.findMany({
      where: { agencyId: ao.dpgf.project.agencyId, role: { in: ['ARCHITECT', 'COLLABORATOR'] } },
      select: { id: true, email: true, firstName: true },
    })

    await Promise.allSettled([
      // Emails en parallèle
      ...architects.map((architect) =>
        sendEmail({
          to: architect.email,
          subject: `Nouvelle offre reçue — ${ao.name}`,
          html: OfferReceivedEmail({
            architectName: architect.firstName ?? 'Architecte',
            companyName,
            aoName: ao.name,
            projectName: ao.dpgf.project.name,
          }),
        }).catch((emailErr) => console.error('[PUT /api/portal/offer] email error', emailErr))
      ),
      // Notifications in-app (createMany = une seule requête)
      prisma.notification.createMany({
        data: architects.map((a) => ({
          userId: a.id,
          type: 'OFFER_SUBMITTED',
          title: `Nouvelle offre reçue`,
          body: `${companyName} a soumis une offre pour ${ao.name}`,
          link: `/dpgf/${ao.dpgf.project.id}/analyse`,
        })),
      }),
    ])

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('[PUT /api/portal/[aoId]/offer]', error)
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
