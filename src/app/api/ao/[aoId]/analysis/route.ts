import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canSeeEstimate } from '@/lib/dpgf-permissions'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: { aoId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

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

    if (!ao || ao.dpgf.project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'AO introuvable' }, { status: 404 })
    }

    const seeEstimate = await canSeeEstimate(ao.dpgf.project.id, user.id, user.role)

    const aoCompanies = await prisma.aOCompany.findMany({
      where: { aoId: params.aoId, offer: { isComplete: true } },
      include: {
        offer: {
          include: { offerPosts: { include: { post: true } } },
        },
      },
    })

    // Fetch user info for each company
    const companyUserIds = aoCompanies.map((c) => c.companyUserId)
    const companyUsers = await prisma.user.findMany({
      where: { id: { in: companyUserIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        agency: { select: { name: true, siretVerified: true } },
      },
    })
    const userMap = new Map(companyUsers.map((u) => [u.id, u]))

    // Fetch admin docs counts per company
    const adminDocsRaw = await prisma.adminDoc.findMany({
      where: {
        aoCompanyId: { in: aoCompanies.map((c) => c.id) },
        status: { in: ['PENDING', 'VALID'] },
      },
      select: { aoCompanyId: true },
    })
    const adminDocsCount = new Map<string, number>()
    for (const doc of adminDocsRaw) {
      adminDocsCount.set(doc.aoCompanyId, (adminDocsCount.get(doc.aoCompanyId) ?? 0) + 1)
    }

    const lots = await prisma.lot.findMany({
      where: { dpgfId: ao.dpgfId, id: { in: ao.lotIds } },
      include: { posts: { orderBy: { position: 'asc' } } },
      orderBy: { position: 'asc' },
    })

    type OfferPostData = { unitPrice: number | null; qtyCompany: number | null; qtyMotive: string | null }
    const offerIndex = new Map<string, Map<string, OfferPostData>>()

    for (const company of aoCompanies) {
      const postMap = new Map<string, OfferPostData>()
      for (const op of company.offer?.offerPosts ?? []) {
        postMap.set(op.postId, {
          unitPrice: op.unitPrice ?? null,
          qtyCompany: op.qtyCompany ?? null,
          qtyMotive: op.qtyMotive ?? null,
        })
      }
      offerIndex.set(company.id, postMap)
    }

    let globalMin: number | null = null
    let globalMax: number | null = null
    let estimatifTotal: number | null = null
    let divergenceCount = 0

    const lotsData = lots.map((lot) => {
      let lotTotalArchi: number | null = null

      const postsData = lot.posts.map((post) => {
        const postTotalArchi =
          post.qtyArchi != null && post.unitPriceArchi != null
            ? post.qtyArchi * post.unitPriceArchi
            : null
        if (postTotalArchi != null) lotTotalArchi = (lotTotalArchi ?? 0) + postTotalArchi

        let minPrice: number | null = null
        let maxPrice: number | null = null
        let minCompanyId: string | null = null
        let maxCompanyId: string | null = null
        let hasQtyDivergence = false

        for (const company of aoCompanies) {
          const op = offerIndex.get(company.id)?.get(post.id)
          if (!op) continue
          const qty = op.qtyCompany ?? post.qtyArchi
          const total = qty != null && op.unitPrice != null ? qty * op.unitPrice : null
          if (total != null) {
            if (minPrice === null || total < minPrice) { minPrice = total; minCompanyId = company.id }
            if (maxPrice === null || total > maxPrice) { maxPrice = total; maxCompanyId = company.id }
          }
          if (op.qtyCompany != null && post.qtyArchi != null && op.qtyCompany !== post.qtyArchi) {
            hasQtyDivergence = true
          }
        }
        if (hasQtyDivergence) divergenceCount++

        return {
          id: post.id,
          ref: post.ref,
          title: post.title,
          unit: post.unit,
          qtyArchi: post.qtyArchi ?? null,
          unitPriceArchi: seeEstimate ? (post.unitPriceArchi ?? null) : null,
          totalArchi: seeEstimate ? postTotalArchi : null,
          minPrice,
          maxPrice,
          minCompanyId,
          maxCompanyId,
          hasQtyDivergence,
        }
      })

      if (lotTotalArchi != null) estimatifTotal = (estimatifTotal ?? 0) + lotTotalArchi

      return { id: lot.id, number: lot.number, name: lot.name, totalArchi: seeEstimate ? lotTotalArchi : null, posts: postsData }
    })

    const companiesData = aoCompanies.map((company) => {
      const u = userMap.get(company.companyUserId)
      const name =
        u?.agency?.name ??
        ([u?.firstName, u?.lastName].filter(Boolean).join(' ') || 'Entreprise inconnue')

      let total: number | null = null
      const postMap = offerIndex.get(company.id) ?? new Map()
      let companyDivergences = 0

      for (const lot of lots) {
        for (const post of lot.posts) {
          const op = postMap.get(post.id)
          if (!op) continue
          const qty = op.qtyCompany ?? post.qtyArchi
          if (qty != null && op.unitPrice != null) total = (total ?? 0) + qty * op.unitPrice
          if (op.qtyCompany != null && post.qtyArchi != null && op.qtyCompany !== post.qtyArchi) {
            companyDivergences++
          }
        }
      }

      if (total != null) {
        if (globalMin === null || total < globalMin) globalMin = total
        if (globalMax === null || total > globalMax) globalMax = total
      }

      const offerPosts: Record<string, OfferPostData> = {}
      postMap.forEach((v, k) => { offerPosts[k] = v })

      return {
        id: company.id,
        name,
        total,
        offerPosts,
        submittedAt: company.offer?.submittedAt?.toISOString() ?? null,
        adminDocsCount: adminDocsCount.get(company.id) ?? 0,
        siretVerified: u?.agency?.siretVerified ?? false,
        divergences: companyDivergences,
      }
    })

    return NextResponse.json({
      ao: {
        id: ao.id,
        name: ao.name,
        deadline: ao.deadline.toISOString(),
        status: ao.status,
        clientPublished: ao.clientPublished,
        publishedElements: ao.publishedElements,
      },
      project: { id: ao.dpgf.project.id, name: ao.dpgf.project.name },
      companies: companiesData,
      lots: lotsData,
      totals: {
        estimatif: seeEstimate ? estimatifTotal : null,
        min: globalMin,
        max: globalMax,
        ecart: globalMin != null && globalMax != null ? globalMax - globalMin : null,
      },
      divergenceCount,
    })
  } catch (error) {
    console.error('[GET /api/ao/[aoId]/analysis]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
