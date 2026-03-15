import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AnalysisPageClient } from '@/components/dpgf/AnalysisPageClient'
import { DEFAULT_WEIGHTS } from '@/lib/scoring'

interface Props {
  params: { projectId: string }
}

export default async function AnalysePage({ params }: Props) {
  const user = await requireRole(['ARCHITECT', 'COLLABORATOR', 'ADMIN'])

  // Round-trip 2 : project + ao en parallèle (les deux utilisent params.projectId)
  const [project, ao] = await Promise.all([
    prisma.project.findUnique({
      where: { id: params.projectId },
      select: { id: true, name: true, agencyId: true, vatRate: true },
    }),
    prisma.aO.findFirst({
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
    }),
  ])

  if (!project || project.agencyId !== user.agencyId) redirect('/dashboard')

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

  // Round-trip 3 : aoCompanies (dépend de ao.id)
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

  // Round-trip 4 : 5 requêtes en parallèle
  const companyUserIds = aoCompanies.map((c) => c.companyUserId)
  const aoCompanyIds = aoCompanies.map((c) => c.id)

  const [companyUsers, adminDocsRaw, qaRaw, lots, scoringConfigRaw] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: companyUserIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        agency: { select: { name: true, siret: true, siretVerified: true, createdAt: true } },
      },
    }),
    prisma.adminDoc.findMany({
      where: { aoCompanyId: { in: aoCompanyIds } },
      select: { id: true, aoCompanyId: true, type: true, status: true, fileUrl: true, rejectionReason: true, expiresAt: true },
    }),
    prisma.qA.findMany({
      where: { aoId: ao.id },
      select: { aoCompanyId: true },
    }),
    prisma.lot.findMany({
      where: { dpgfId: ao.dpgfId, id: { in: ao.lotIds } },
      include: { posts: { orderBy: { position: 'asc' } } },
      orderBy: { position: 'asc' },
    }),
    prisma.aOScoringConfig.findUnique({ where: { aoId: ao.id } }),
  ])

  const userMap = new Map(companyUsers.map((u) => [u.id, u]))

  // Fetch director names from data.gouv.fr in parallel for reliability scoring
  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

  const directorMatchMap = new Map<string, boolean | null>()
  await Promise.allSettled(
    companyUsers.map(async (u) => {
      const siret = (u.agency as { siret?: string | null } | null)?.siret ?? null
      if (!siret || siret.length < 9) return
      const siren = siret.slice(0, 9)
      try {
        const res = await fetch(
          `https://recherche-entreprises.api.gouv.fr/search?q=${siren}&per_page=1`,
          { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000) }
        )
        if (!res.ok) return
        const govData = await res.json() as {
          results?: Array<{ dirigeants?: Array<{ nom?: string; prenoms?: string }> }>
        }
        const firstDirigeant = govData.results?.[0]?.dirigeants?.[0]
        if (!firstDirigeant?.nom) return
        const govLast = normalize(firstDirigeant.nom)
        const registeredLast = normalize(u.lastName ?? '')
        const match = govLast.length > 0 && registeredLast.length > 0
          ? govLast === registeredLast
          : null
        directorMatchMap.set(u.id, match)
      } catch { /* API unavailable — ignore */ }
    })
  )

  type AdminDocItem = { id: string; type: string; status: string; fileUrl: string; rejectionReason: string | null; expiresAt: string | null }
  const adminDocsMap = new Map<string, AdminDocItem[]>()
  for (const doc of adminDocsRaw) {
    const arr = adminDocsMap.get(doc.aoCompanyId) ?? []
    arr.push({ id: doc.id, type: doc.type, status: doc.status, fileUrl: doc.fileUrl, rejectionReason: doc.rejectionReason, expiresAt: doc.expiresAt?.toISOString() ?? null })
    adminDocsMap.set(doc.aoCompanyId, arr)
  }

  const qaCountMap = new Map<string, number>()
  for (const qa of qaRaw) {
    qaCountMap.set(qa.aoCompanyId, (qaCountMap.get(qa.aoCompanyId) ?? 0) + 1)
  }

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
      directorNameMatch: directorMatchMap.get(company.companyUserId) ?? null,
    }
  })

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
        vatRate: project.vatRate,
      }}
    />
  )
}
