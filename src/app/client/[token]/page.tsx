import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ClientAnalysisView } from '@/components/client/ClientAnalysisView'
import type { ClientCompany, ClientLot } from '@/components/client/ClientAnalysisView'

interface Props {
  params: { token: string }
}

export default async function ClientPage({ params }: Props) {
  const project = await prisma.project.findUnique({
    where: { clientToken: params.token },
    select: { id: true, name: true },
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
      publishedElements: true,
      dpgf: {
        select: {
          lots: {
            select: {
              id: true,
              number: true,
              name: true,
              position: true,
              posts: {
                select: {
                  id: true,
                  ref: true,
                  title: true,
                  unit: true,
                  qtyArchi: true,
                  // unitPriceArchi et totalArchi intentionnellement exclus
                  position: true,
                },
                orderBy: { position: 'asc' },
              },
            },
            orderBy: { position: 'asc' },
          },
        },
      },
      aoCompanies: {
        select: {
          id: true,
          status: true,
          companyUserId: true,
          offer: {
            select: {
              isComplete: true,
              submittedAt: true,
              offerPosts: {
                select: {
                  postId: true,
                  unitPrice: true,
                  qtyCompany: true,
                  post: { select: { qtyArchi: true } },
                },
              },
            },
          },
        },
      },
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

  // Résolution des noms d'entreprises (agency.name > prénom nom > email)
  const companyUserIds = ao.aoCompanies.map((c) => c.companyUserId)
  const companyUsers = await prisma.user.findMany({
    where: { id: { in: companyUserIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      agency: { select: { name: true } },
    },
  })
  const userMap = new Map(companyUsers.map((u) => [u.id, u]))

  function companyName(companyUserId: string): string {
    const u = userMap.get(companyUserId)
    if (!u) return 'Entreprise inconnue'
    return (
      u.agency?.name ??
      ([u.firstName, u.lastName].filter(Boolean).join(' ') || u.email)
    )
  }

  const totalInvited = ao.aoCompanies.length
  const totalSubmitted = ao.aoCompanies.filter((c) => c.status === 'SUBMITTED').length
  const responseRate = totalInvited ? Math.round((totalSubmitted / totalInvited) * 100) : 0
  const deadline = new Date(ao.deadline)
  const isDeadlinePassed = now > deadline
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  // ── Calcul des données pour l'analyse ────────────────────────────────────
  const submittedCompaniesRaw = ao.aoCompanies.filter((c) => c.status === 'SUBMITTED' && c.offer)

  // Totaux par entreprise → tri croissant (offre la moins chère en premier)
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

  // Map postId → aoCompanyId → pricing
  const offerPriceMap = new Map<string, Map<string, { unitPrice: number | null; qty: number | null }>>()
  for (const company of submittedCompaniesRaw) {
    for (const op of company.offer?.offerPosts ?? []) {
      if (!offerPriceMap.has(op.postId)) offerPriceMap.set(op.postId, new Map())
      offerPriceMap.get(op.postId)!.set(company.id, {
        unitPrice: op.unitPrice,
        qty: op.qtyCompany ?? op.post.qtyArchi,
      })
    }
  }

  const lots: ClientLot[] = ao.dpgf.lots.map((lot) => ({
    id: lot.id,
    number: lot.number,
    name: lot.name,
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
        ref: post.ref,
        title: post.title,
        unit: post.unit,
        qtyArchi: post.qtyArchi,
        hasQtyDivergence,
        prices: pricesWithTotals.map((p) => ({
          ...p,
          isMin: p.total != null && minTotal != null && p.total === minTotal,
          isMax:
            p.total != null && maxTotal != null && p.total === maxTotal && minTotal !== maxTotal,
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
          <span className="px-3 py-1.5 rounded-full text-sm font-medium" style={{ background: 'var(--surface2)', color: 'var(--text2)' }}>
            Délai dépassé
          </span>
        ) : (
          <span className="px-3 py-1.5 rounded-full text-sm font-medium" style={{ background: 'var(--amber-light)', color: 'var(--amber)' }}>
            J-{daysLeft}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Entreprises consultées', value: publishedElements.companies ? totalInvited : '—' },
          { label: 'Offres reçues', value: publishedElements.offers ? totalSubmitted : '—' },
          { label: 'Taux de réponse', value: publishedElements.offers ? `${responseRate}%` : '—' },
        ].map((stat, i) => (
          <div
            key={i}
            className="p-4 rounded-[var(--radius-lg)]"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            <p className="text-xs mb-1" style={{ color: 'var(--text3)' }}>{stat.label}</p>
            <p className="text-2xl font-semibold" style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--text)' }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Avancement */}
      {!!publishedElements.progress && (
        <div
          className="rounded-[var(--radius-lg)] overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="px-4 py-3 border-b" style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Avancement des réponses</p>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {ao.aoCompanies.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm" style={{ color: 'var(--text)' }}>
                  {companyName(c.companyUserId)}
                </span>
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{
                    background:
                      c.status === 'SUBMITTED'
                        ? 'var(--green-light)'
                        : c.status === 'IN_PROGRESS'
                        ? 'var(--amber-light)'
                        : 'var(--surface2)',
                    color:
                      c.status === 'SUBMITTED'
                        ? 'var(--green)'
                        : c.status === 'IN_PROGRESS'
                        ? 'var(--amber)'
                        : 'var(--text3)',
                  }}
                >
                  {c.status === 'SUBMITTED'
                    ? 'Offre soumise'
                    : c.status === 'IN_PROGRESS'
                    ? 'En cours'
                    : 'En attente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analyse comparative */}
      {publishedElements.analysis ? (
        <ClientAnalysisView
          publishedElements={publishedElements}
          companies={companies}
          lots={lots}
        />
      ) : (
        <div
          className="p-6 rounded-[var(--radius-lg)] text-center"
          style={{ background: 'var(--surface)', border: '1px dashed var(--border2)' }}
        >
          <p className="text-2xl mb-2">🔒</p>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            Analyse comparative
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text2)' }}>
            L&apos;architecte publiera l&apos;analyse dès que toutes les offres auront été étudiées.
          </p>
        </div>
      )}
    </div>
  )
}
