import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PortalPageClient } from '@/components/portal/PortalPageClient'
import { computeDpgfDiff, type SnapshotJson, type LotSnapshot, type DpgfDiff } from '@/lib/dpgf-diff'

interface Props {
  params: { aoId: string }
  searchParams: { token?: string }
}

export default async function PortalPage({ params, searchParams }: Props) {
  const token = searchParams.token ?? null

  // Auth : token opaque vérifié par lookup DB
  if (!token) redirect('/login?error=lien_invalide')

  const aoCompanyRecord = await prisma.aOCompany.findFirst({
    where: { inviteToken: token, aoId: params.aoId },
    select: { id: true, companyUserId: true, status: true },
  })

  if (!aoCompanyRecord) redirect('/login?error=lien_invalide')

  const aoCompanyId = aoCompanyRecord.id
  const companyUserId = aoCompanyRecord.companyUserId

  // 3. Récupérer l'AO (sans estimatif)
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
      snapshotJson: true,
      sentAt: true,
    },
  })

  if (!ao) redirect('/dashboard')

  if (ao.status === 'DRAFT') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div
          className="w-full max-w-md p-8 text-center rounded-[var(--radius-lg)]"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
        >
          <h1 className="text-2xl mb-3" style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--green)' }}>
            ArchFlow
          </h1>
          <p className="text-base font-medium mb-2" style={{ color: 'var(--text)' }}>
            Cet appel d&apos;offre n&apos;est pas encore ouvert
          </p>
          <p className="text-sm" style={{ color: 'var(--text2)' }}>
            L&apos;architecte n&apos;a pas encore envoyé l&apos;AO. Vous recevrez un email dès qu&apos;il sera disponible.
          </p>
        </div>
      </div>
    )
  }

  // 4. Récupérer les lots inclus sans estimatif archi
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
        },
      },
    },
  })

  // 5. Récupérer l'offre en cours
  const offer = await prisma.offer.findFirst({
    where: { aoCompanyId: aoCompanyId! },
    select: {
      id: true,
      submittedAt: true,
      isComplete: true,
      offerPosts: {
        select: {
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

  // 6. Récupérer l'utilisateur entreprise
  const companyUser = await prisma.user.findUnique({
    where: { id: companyUserId! },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      agency: { select: { name: true, siret: true, phone: true, trade: true, companyAddress: true, city: true } },
    },
  })

  // Profil incomplet si champs obligatoires manquants
  const agency = companyUser?.agency
  const profileIncomplete = !agency?.name || !agency?.siret || !agency?.phone || !agency?.trade || !agency?.companyAddress || !agency?.city

  // 7b. Calculer le diff DPGF (snapshot vs état actuel)
  let diff: DpgfDiff | null = null
  if (ao.snapshotJson) {
    const snapshot = ao.snapshotJson as unknown as SnapshotJson
    const currentLots: LotSnapshot[] = lots.map((l) => ({
      id: l.id,
      number: l.number,
      name: l.name,
      posts: l.posts.map((p) => ({
        id: p.id,
        ref: p.ref,
        title: p.title,
        unit: p.unit,
        qtyArchi: p.qtyArchi,
      })),
    }))
    const computed = computeDpgfDiff(snapshot, currentLots)
    if (computed.total > 0) diff = computed
  }

  // 7c. Documents DCE nouveaux depuis l'envoi
  const newDocumentIds = ao.sentAt
    ? (
        await prisma.document.findMany({
          where: { aoId: params.aoId, createdAt: { gt: ao.sentAt } },
          select: { id: true },
        })
      ).map((d) => d.id)
    : []

  // 7. Récupérer les docs admin déjà déposés
  const uploadedAdminDocs = await prisma.adminDoc.findMany({
    where: { aoCompanyId: aoCompanyId!, status: { in: ['PENDING', 'VALID'] } },
    select: { type: true },
  })
  const uploadedDocTypes = uploadedAdminDocs.map((d) => d.type)

  // 8. Marquer comme ouvert à la première visite
  if (aoCompanyRecord.status === 'INVITED') {
    await prisma.aOCompany.update({
      where: { id: aoCompanyId! },
      data: { status: 'OPENED' },
    })
  }

  type RequiredDocItem = { type: string; label: string; required: boolean }
  const requiredDocs = Array.isArray(ao.requiredDocs)
    ? (ao.requiredDocs as RequiredDocItem[])
    : null

  return (
    <PortalPageClient
      ao={{
        id: ao.id,
        name: ao.name,
        deadline: ao.deadline.toISOString(),
        instructions: ao.instructions,
        allowCustomQty: ao.allowCustomQty,
        isPaid: ao.isPaid,
        paymentAmount: ao.paymentAmount,
        status: ao.status,
        lotIds: ao.lotIds,
      }}
      requiredDocs={requiredDocs}
      uploadedDocTypes={uploadedDocTypes}
      lots={lots}
      initialOffer={
        offer
          ? {
              id: offer.id,
              submittedAt: offer.submittedAt?.toISOString() ?? null,
              isComplete: offer.isComplete,
              offerPosts: offer.offerPosts,
            }
          : null
      }
      token={token}
      companyUser={{
        id: companyUser?.id ?? '',
        email: companyUser?.email ?? '',
        firstName: companyUser?.firstName ?? null,
        lastName: companyUser?.lastName ?? null,
        companyName: companyUser?.agency?.name ?? null,
      }}
      aoCompanyId={aoCompanyId!}
      diff={diff}
      newDocumentIds={newDocumentIds}
      profileIncomplete={profileIncomplete}
    />
  )
}
