import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AnalysisPageClient } from '@/components/dpgf/AnalysisPageClient'
import { DEFAULT_WEIGHTS } from '@/lib/scoring'

interface Props {
  params: { projectId: string }
}

export default async function AnalysePage({ params }: Props) {
  const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    select: { id: true, name: true, agencyId: true },
  })

  if (!project || project.agencyId !== user.agencyId) redirect('/dashboard')

  const ao = await prisma.aO.findFirst({
    where: {
      dpgf: { projectId: params.projectId },
      status: { not: 'ARCHIVED' },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      deadline: true,
      status: true,
      dpgfId: true,
      lotIds: true,
      clientPublished: true,
      publishedElements: true,
      createdAt: true,
    },
  })

  if (!ao) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <p className="text-base font-medium" style={{ color: 'var(--text)' }}>
          Aucun appel d&apos;offre pour ce projet
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--text2)' }}>
          Créez un AO depuis la page DPGF pour accéder à l&apos;analyse.
        </p>
      </div>
    )
  }

  const aoCompanies = await prisma.aOCompany.findMany({
    where: { aoId: ao.id, offer: { isComplete: true } },
    include: {
      offer: {
        include: { offerPosts: { include: { post: true } } },
      },
    },
  })

  if (aoCompanies.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <p className="text-base font-medium" style={{ color: 'var(--text)' }}>
          Aucune offre reçue
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--text2)' }}>
          Le tableau d&apos;analyse s&apos;affichera dès que des entreprises auront soumis leur offre.
        </p>
      </div>
    )
  }

  const companyUserIds = aoCompanies.map((c) => c.companyUserId)
  const companyUsers = await prisma.user.findMany({
    where: { id: { in: companyUserIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      agency: { select: { name: true, siretVerified: true, createdAt: true } },
    },
  })
  const userMap = new Map(companyUsers.map((u) => [u.id, u]))

  const adminDocsRaw = await prisma.adminDoc.findMany({
    where: { aoCompanyId: { in: aoCompanies.map((c) => c.id) } },
    select: { aoCompanyId: true, type: true, status: true },
  })
  const adminDocsMap = new Map<string, { type: string; status: string }[]>()
  for (const doc of adminDocsRaw) {
    const arr = adminDocsMap.get(doc.aoCompanyId) ?? []
    arr.push({ type: doc.type, status: doc.status })
    adminDocsMap.set(doc.aoCompanyId, arr)
  }

  // QA per company
  const qaRaw = await prisma.qA.findMany({
    where: { aoId: ao.id },
    select: { aoCompanyId: true },
  })
  const qaCountMap = new Map<string, number>()
  for (const qa of qaRaw) {
    qaCountMap.set(qa.aoCompanyId, (qaCountMap.get(qa.aoCompanyId) ?? 0) + 1)
  }

  const lots = await prisma.lot.findMany({
    where: { dpgfId: ao.dpgfId, id: { in: ao.lotIds } },
    include: { posts: { orderBy: { position: 'asc' } } },
    orderBy: { position: 'asc' },
  })

  const totalPosts = lots.reduce((acc, l) => acc + l.posts.length, 0)

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
        id: post.id, ref: post.ref, title: post.title, unit: post.unit,
        qtyArchi: post.qtyArchi ?? null, unitPriceArchi: post.unitPriceArchi ?? null,
        totalArchi: postTotalArchi, minPrice, maxPrice, minCompanyId, maxCompanyId, hasQtyDivergence,
      }
    })
    if (lotTotalArchi != null) estimatifTotal = (estimatifTotal ?? 0) + lotTotalArchi
    return { id: lot.id, number: lot.number, name: lot.name, totalArchi: lotTotalArchi, posts: postsData }
  })

  const companiesData = aoCompanies.map((company) => {
    const u = userMap.get(company.companyUserId)
    const name =
      u?.agency?.name ??
      ([u?.firstName, u?.lastName].filter(Boolean).join(' ') || 'Entreprise inconnue')

    let total: number | null = null
    let divergences = 0
    let pricedPosts = 0
    const postMap = offerIndex.get(company.id) ?? new Map()

    for (const lot of lots) {
      for (const post of lot.posts) {
        const op = postMap.get(post.id)
        if (!op) continue
        if (op.unitPrice !== null) pricedPosts++
        const qty = op.qtyCompany ?? post.qtyArchi
        if (qty != null && op.unitPrice != null) total = (total ?? 0) + qty * op.unitPrice
        if (op.qtyCompany != null && post.qtyArchi != null && op.qtyCompany !== post.qtyArchi) {
          divergences++
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
      invitedAt: ao.createdAt.toISOString(),
      adminDocs: adminDocsMap.get(company.id) ?? [],
      siretVerified: u?.agency?.siretVerified ?? false,
      agencyCreatedAt: u?.agency?.createdAt?.toISOString() ?? null,
      divergences,
      totalPosts,
      pricedPosts,
      hasAskedQuestion: (qaCountMap.get(company.id) ?? 0) > 0,
    }
  })

  const scoringConfigRaw = await prisma.aOScoringConfig.findUnique({ where: { aoId: ao.id } })
  const scoringConfig = scoringConfigRaw
    ? {
        weightPrice: scoringConfigRaw.weightPrice,
        weightDocuments: scoringConfigRaw.weightDocuments,
        weightReliability: scoringConfigRaw.weightReliability,
        weightDivergences: scoringConfigRaw.weightDivergences,
        weightReactivity: scoringConfigRaw.weightReactivity,
      }
    : DEFAULT_WEIGHTS

  const publishedElements = (ao.publishedElements ?? {}) as Record<string, unknown>

  return (
    <AnalysisPageClient
      projectId={params.projectId}
      projectName={project.name}
      agencyName={user.agency?.name ?? ''}
      initialData={{
        ao: {
          id: ao.id,
          name: ao.name,
          deadline: ao.deadline.toISOString(),
          status: ao.status,
          clientPublished: ao.clientPublished,
          publishedElements,
        },
        project: { id: project.id, name: project.name },
        companies: companiesData,
        lots: lotsData,
        totals: {
          estimatif: estimatifTotal,
          min: globalMin,
          max: globalMax,
          ecart: globalMin != null && globalMax != null ? globalMax - globalMin : null,
        },
        divergenceCount,
        scoringConfig,
      }}
    />
  )
}
