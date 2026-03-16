import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ClientAnalysisView } from '@/components/client/ClientAnalysisView'
import { AnalysisPageClient } from '@/components/dpgf/AnalysisPageClient'
import { DEFAULT_WEIGHTS } from '@/lib/scoring'
import type { ClientCompany, ClientLot } from '@/components/client/ClientAnalysisView'

interface Props {
  params: { token: string }
}

export default async function ClientPage({ params }: Props) {
  const project = await prisma.project.findUnique({
    where: { clientToken: params.token },
    select: { id: true, name: true, vatRate: true },
  })

  if (!project) notFound()

  const ao = await prisma.aO.findFirst({
    where: {
      dpgf: { projectId: project.id },
      clientPublished: true,
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
      publishedElements: true,
      clientPublished: true,
      createdAt: true,
    },
  })

  const now = new Date()

  if (!ao) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <h1 className="text-3xl mb-3" style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--text)' }}>
          {project.name}
        </h1>
        <p className="text-sm" style={{ color: 'var(--text2)' }}>
          L&apos;analyse de la consultation n&apos;a pas encore été publiée.
          <br />Vous recevrez une notification dès qu&apos;elle sera disponible.
        </p>
      </div>
    )
  }

  const publishedElements = (ao.publishedElements ?? {}) as Record<string, unknown>
  const selectedCompanyIds = Array.isArray(publishedElements.selectedCompanyIds)
    ? (publishedElements.selectedCompanyIds as string[])
    : []
  const awardedCompanyId = (publishedElements.awardedCompanyId as string | null) ?? null
  const deadline = new Date(ao.deadline)
  const isDeadlinePassed = now > deadline
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  // ── Vue complète (full_analysis) ─────────────────────────────────────────
  if (publishedElements.full_analysis) {
    const aoCompanies = await prisma.aOCompany.findMany({
      where: { aoId: ao.id, offer: { isComplete: true } },
      include: { offer: { include: { offerPosts: { include: { post: true } } } } },
    })

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
          const match = govLast.length > 0 && registeredLast.length > 0 ? govLast === registeredLast : null
          directorMatchMap.set(u.id, match)
        } catch { /* API unavailable */ }
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
        postMap.set(op.postId, { unitPrice: op.unitPrice ?? null, qtyCompany: op.qtyCompany ?? null, qtyMotive: op.qtyMotive ?? null })
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
        const postTotalArchi = post.qtyArchi != null && post.unitPriceArchi != null ? post.qtyArchi * post.unitPriceArchi : null
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
          if (op.qtyCompany != null && post.qtyArchi != null && op.qtyCompany !== post.qtyArchi) hasQtyDivergence = true
        }
        if (hasQtyDivergence) divergenceCount++

        return { id: post.id, ref: post.ref, title: post.title, unit: post.unit, qtyArchi: post.qtyArchi ?? null, unitPriceArchi: post.unitPriceArchi ?? null, totalArchi: postTotalArchi, minPrice, maxPrice, minCompanyId, maxCompanyId, hasQtyDivergence }
      })
      if (lotTotalArchi != null) estimatifTotal = (estimatifTotal ?? 0) + lotTotalArchi
      return { id: lot.id, number: lot.number, name: lot.name, totalArchi: lotTotalArchi, posts: postsData }
    })

    const companiesData = aoCompanies.map((company) => {
      const u = userMap.get(company.companyUserId)
      const name = u?.agency?.name ?? ([u?.firstName, u?.lastName].filter(Boolean).join(' ') || 'Entreprise inconnue')
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
          if (op.qtyCompany != null && post.qtyArchi != null && op.qtyCompany !== post.qtyArchi) divergences++
        }
      }

      if (total != null) {
        if (globalMin === null || total < globalMin) globalMin = total
        if (globalMax === null || total > globalMax) globalMax = total
      }

      const offerPosts: Record<string, OfferPostData> = {}
      postMap.forEach((v, k) => { offerPosts[k] = v })

      return {
        id: company.id, name, total, offerPosts,
        submittedAt: company.offer?.submittedAt?.toISOString() ?? null,
        invitedAt: ao.createdAt.toISOString(),
        adminDocs: adminDocsMap.get(company.id) ?? [],
        siretVerified: u?.agency?.siretVerified ?? false,
        agencyCreatedAt: u?.agency?.createdAt?.toISOString() ?? null,
        divergences, totalPosts, pricedPosts,
        hasAskedQuestion: (qaCountMap.get(company.id) ?? 0) > 0,
        directorNameMatch: directorMatchMap.get(company.companyUserId) ?? null,
      }
    })

    const scoringConfig = scoringConfigRaw
      ? { weightPrice: scoringConfigRaw.weightPrice, weightDocuments: scoringConfigRaw.weightDocuments, weightReliability: scoringConfigRaw.weightReliability, weightDivergences: scoringConfigRaw.weightDivergences, weightReactivity: scoringConfigRaw.weightReactivity }
      : DEFAULT_WEIGHTS

    return (
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-4">
        {/* En-tête client */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl mb-1" style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--text)' }}>
              {project.name}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text2)' }}>{ao.name}</p>
          </div>
          <div
            className="px-3 py-1.5 rounded-full text-sm font-medium flex-shrink-0"
            style={isDeadlinePassed
              ? { background: 'var(--surface2)', color: 'var(--text2)' }
              : { background: 'var(--amber-light)', color: 'var(--amber)' }}
          >
            {isDeadlinePassed ? 'Délai dépassé' : `J-${daysLeft}`}
          </div>
        </div>
        {/* Vue complète de l'analyse */}
        <AnalysisPageClient
          projectId=""
          projectName={project.name}
          agencyName=""
          readOnly={true}
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
      </div>
    )
  }

  // ── Vue standard ─────────────────────────────────────────────────────────

  const aoWithCompanies = await prisma.aO.findFirst({
    where: { id: ao.id },
    select: {
      dpgf: {
        select: {
          lots: {
            select: {
              id: true, number: true, name: true, position: true,
              posts: {
                select: { id: true, ref: true, title: true, unit: true, qtyArchi: true, position: true },
                orderBy: { position: 'asc' },
              },
            },
            orderBy: { position: 'asc' },
          },
        },
      },
      aoCompanies: {
        select: {
          id: true, status: true, companyUserId: true,
          offer: {
            select: {
              isComplete: true, submittedAt: true,
              offerPosts: {
                select: { postId: true, unitPrice: true, qtyCompany: true, post: { select: { qtyArchi: true } } },
              },
            },
          },
        },
      },
    },
  })

  if (!aoWithCompanies) notFound()

  const companyUserIds = aoWithCompanies.aoCompanies.map((c) => c.companyUserId)
  const companyUsers = await prisma.user.findMany({
    where: { id: { in: companyUserIds } },
    select: { id: true, firstName: true, lastName: true, email: true, agency: { select: { name: true } } },
  })
  const userMap = new Map(companyUsers.map((u) => [u.id, u]))

  function companyName(companyUserId: string): string {
    const u = userMap.get(companyUserId)
    if (!u) return 'Entreprise inconnue'
    return (u.agency?.name ?? ([u.firstName, u.lastName].filter(Boolean).join(' ') || u.email))
  }

  const totalInvited = aoWithCompanies.aoCompanies.length
  const totalSubmitted = aoWithCompanies.aoCompanies.filter((c) => c.status === 'SUBMITTED').length
  const responseRate = totalInvited ? Math.round((totalSubmitted / totalInvited) * 100) : 0

  const submittedCompaniesRaw = aoWithCompanies.aoCompanies.filter((c) => c.status === 'SUBMITTED' && c.offer)

  const sortedCompaniesRaw = submittedCompaniesRaw
    .map((c) => {
      const total = (c.offer?.offerPosts ?? []).reduce((sum, op) => {
        const qty = op.qtyCompany ?? op.post.qtyArchi
        if (qty == null || op.unitPrice == null) return sum
        return sum + qty * op.unitPrice
      }, 0)
      return { id: c.id, companyUserId: c.companyUserId, total }
    })
    .sort((a, b) => a.total - b.total)

  const companies: ClientCompany[] = sortedCompaniesRaw.map((c) => ({
    id: c.id,
    name: companyName(c.companyUserId),
    isSelected: selectedCompanyIds.includes(c.id) || c.id === awardedCompanyId,
    total: c.total,
  }))

  const offerPriceMap = new Map<string, Map<string, { unitPrice: number | null; qty: number | null }>>()
  for (const company of submittedCompaniesRaw) {
    for (const op of company.offer?.offerPosts ?? []) {
      if (!offerPriceMap.has(op.postId)) offerPriceMap.set(op.postId, new Map())
      offerPriceMap.get(op.postId)!.set(company.id, { unitPrice: op.unitPrice, qty: op.qtyCompany ?? op.post.qtyArchi })
    }
  }

  const lots: ClientLot[] = aoWithCompanies.dpgf.lots.map((lot) => ({
    id: lot.id, number: lot.number, name: lot.name,
    posts: lot.posts.map((post) => {
      const postPrices = offerPriceMap.get(post.id)
      const pricesWithTotals = companies.map((c) => {
        const p = postPrices?.get(c.id)
        const qty = p?.qty ?? post.qtyArchi
        const unitPrice = p?.unitPrice ?? null
        const total = qty != null && unitPrice != null ? qty * unitPrice : null
        return { companyId: c.id, unitPrice, qty, total }
      })
      const validTotals = pricesWithTotals.filter((p) => p.total != null).map((p) => p.total!)
      const minTotal = validTotals.length > 1 ? Math.min(...validTotals) : null
      const maxTotal = validTotals.length > 1 ? Math.max(...validTotals) : null
      const hasQtyDivergence = submittedCompaniesRaw.some((c) => {
        const op = c.offer?.offerPosts.find((op) => op.postId === post.id)
        return op?.qtyCompany != null && op.qtyCompany !== post.qtyArchi
      })
      return {
        ref: post.ref, title: post.title, unit: post.unit, qtyArchi: post.qtyArchi, hasQtyDivergence,
        prices: pricesWithTotals.map((p) => ({
          ...p,
          isMin: p.total != null && minTotal != null && p.total === minTotal,
          isMax: p.total != null && maxTotal != null && p.total === maxTotal && minTotal !== maxTotal,
        })),
      }
    }),
  }))

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl mb-1" style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--text)' }}>
          {project.name}
        </h1>
        <p className="text-sm" style={{ color: 'var(--text2)' }}>{ao.name}</p>
      </div>

      {/* Countdown */}
      <div
        className="p-4 rounded-[var(--radius-lg)] flex items-center justify-between"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-wider mb-0.5" style={{ color: 'var(--text3)' }}>
            Date limite de remise des offres
          </p>
          <p className="text-base font-semibold" style={{ color: 'var(--text)' }}>
            {deadline.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {isDeadlinePassed ? (
          <span className="px-3 py-1.5 rounded-full text-sm font-medium" style={{ background: 'var(--surface2)', color: 'var(--text2)' }}>Délai dépassé</span>
        ) : (
          <span className="px-3 py-1.5 rounded-full text-sm font-medium" style={{ background: 'var(--amber-light)', color: 'var(--amber)' }}>J-{daysLeft}</span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Entreprises consultées', value: publishedElements.companies ? totalInvited : '—' },
          { label: 'Offres reçues', value: publishedElements.offers ? totalSubmitted : '—' },
          { label: 'Taux de réponse', value: publishedElements.offers ? `${responseRate}%` : '—' },
        ].map((stat, i) => (
          <div key={i} className="p-4 rounded-[var(--radius-lg)]" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text3)' }}>{stat.label}</p>
            <p className="text-2xl font-semibold" style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--text)' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Avancement */}
      {!!publishedElements.progress && (
        <div className="rounded-[var(--radius-lg)] overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="px-4 py-3 border-b" style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Avancement des réponses</p>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {aoWithCompanies.aoCompanies.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm" style={{ color: 'var(--text)' }}>{companyName(c.companyUserId)}</span>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{
                  background: c.status === 'SUBMITTED' ? 'var(--green-light)' : c.status === 'IN_PROGRESS' ? 'var(--amber-light)' : 'var(--surface2)',
                  color: c.status === 'SUBMITTED' ? 'var(--green)' : c.status === 'IN_PROGRESS' ? 'var(--amber)' : 'var(--text3)',
                }}>
                  {c.status === 'SUBMITTED' ? 'Offre soumise' : c.status === 'IN_PROGRESS' ? 'En cours' : 'En attente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analyse comparative */}
      {publishedElements.analysis ? (
        <ClientAnalysisView publishedElements={publishedElements} companies={companies} lots={lots} />
      ) : (
        <div className="p-6 rounded-[var(--radius-lg)] text-center" style={{ background: 'var(--surface)', border: '1px dashed var(--border2)' }}>
          <p className="text-2xl mb-2">🔒</p>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Analyse comparative</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text2)' }}>
            L&apos;architecte publiera l&apos;analyse dès que toutes les offres auront été étudiées.
          </p>
        </div>
      )}
    </div>
  )
}
