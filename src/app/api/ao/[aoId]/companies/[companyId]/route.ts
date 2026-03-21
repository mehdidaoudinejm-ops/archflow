import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Normalise une forme juridique pour comparaison
function normalizeLF(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
}

const LEGAL_ABBREV: Record<string, string> = {
  sarl: 'responsabilitelimitee',
  sas:  'actionsimplifiee',
  sasu: 'actionsimplifieeunipersonnelle',
  sa:   'societeanonyme',
  eurl: 'unipersonnelleresponsabilitelimitee',
  sci:  'civilimmobiliere',
  snc:  'nomcollectif',
  ei:   'entrepreneurindividuel',
}

function legalFormsMatch(insee: string, declared: string): boolean {
  const ni = normalizeLF(insee)
  const nd = normalizeLF(declared)
  if (ni === nd) return true
  if (nd.length >= 8 && (ni.includes(nd) || nd.includes(ni))) return true
  const fragment = LEGAL_ABBREV[nd]
  if (fragment && ni.includes(fragment)) return true
  return false
}

export async function GET(
  _req: Request,
  { params }: { params: { aoId: string; companyId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    // Vérifier que l'AO appartient à l'agence
    const ao = await prisma.aO.findUnique({
      where: { id: params.aoId },
      include: {
        dpgf: { include: { project: { select: { agencyId: true } } } },
      },
    })

    if (!ao || ao.dpgf.project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'AO introuvable' }, { status: 404 })
    }

    const aoCompany = await prisma.aOCompany.findUnique({
      where: { id: params.companyId },
      include: {
        offer: { select: { submittedAt: true, isComplete: true } },
        adminDocs: {
          select: { id: true, type: true, status: true, rejectionReason: true, expiresAt: true, fileUrl: true },
          orderBy: { type: 'asc' },
        },
      },
    })

    if (!aoCompany || aoCompany.aoId !== params.aoId) {
      return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 })
    }

    const companyUser = await prisma.user.findUnique({
      where: { id: aoCompany.companyUserId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        agency: {
          select: {
            id: true,
            name: true,
            siret: true,
            siretVerified: true,
            legalForm: true,
            legalFormDeclared: true,
            dateCreationInsee: true,
            companyAddress: true,
            postalCode: true,
            city: true,
            phone: true,
            trade: true,
            signatoryQuality: true,
            dirigeantNom: true,
            dirigeantPrenoms: true,
          },
        },
      },
    })

    const activityLogs = await prisma.activityLog.findMany({
      where: { userId: aoCompany.companyUserId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, action: true, module: true, createdAt: true, metadata: true },
    })

    const agencyExt = companyUser?.agency as ({
      siret?: string | null; siretVerified?: boolean
      legalForm?: string | null; legalFormDeclared?: string | null
      dirigeantNom?: string | null; dirigeantPrenoms?: string | null
    } | null)

    // ── Fetch live data.gouv.fr (non-bloquant) ──────────────────────────────
    let legalFormInsee: string | null = null
    let dirigeant: { nom: string; prenoms: string } | null = null
    let dirigeantNameMatch: boolean | null = null

    const siret = agencyExt?.siret ?? null
    if (siret && siret.length >= 9) {
      try {
        const siren = siret.slice(0, 9)
        const govRes = await fetch(
          `https://recherche-entreprises.api.gouv.fr/search?q=${siren}&per_page=1`,
          { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(3000) }
        )
        if (govRes.ok) {
          const govData = await govRes.json() as {
            results?: Array<{
              libelle_nature_juridique?: string
              dirigeants?: Array<{ nom?: string; prenoms?: string }>
            }>
          }
          const result = govData.results?.[0]
          legalFormInsee = result?.libelle_nature_juridique ?? null

          const govDirigeant = result?.dirigeants?.[0]
          if (govDirigeant?.nom) {
            dirigeant = { nom: govDirigeant.nom, prenoms: govDirigeant.prenoms ?? '' }
            const normalize = (s: string) =>
              s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
            const govLast = normalize(dirigeant.nom)
            const signatoryLast = normalize(companyUser?.lastName ?? '')
            dirigeantNameMatch = govLast.length > 0 && signatoryLast.length > 0 ? govLast === signatoryLast : null
            if (dirigeantNameMatch) {
              const govFirst = normalize(dirigeant.prenoms)
              const signatoryFirst = normalize(companyUser?.firstName ?? '')
              if (govFirst && signatoryFirst) {
                dirigeantNameMatch = govFirst.includes(signatoryFirst) || signatoryFirst.includes(govFirst)
              }
            }
          }
        } else {
          // Réponse non-OK : fallback DB
          legalFormInsee = agencyExt?.legalForm ?? null
          if (agencyExt?.siretVerified && agencyExt.dirigeantNom) {
            dirigeant = { nom: agencyExt.dirigeantNom, prenoms: agencyExt.dirigeantPrenoms ?? '' }
          }
        }
      } catch {
        // Non-bloquant — on utilise les données DB en fallback
        if (agencyExt?.siretVerified && agencyExt.dirigeantNom) {
          dirigeant = { nom: agencyExt.dirigeantNom, prenoms: agencyExt.dirigeantPrenoms ?? '' }
        }
        legalFormInsee = agencyExt?.legalForm ?? null
      }
      // Sécurité : si le fetch a réussi mais sans libelle_nature_juridique, fallback DB
      legalFormInsee = legalFormInsee ?? agencyExt?.legalForm ?? null
    } else if (agencyExt?.siretVerified && agencyExt.dirigeantNom) {
      // Pas de SIRET mais données stockées
      dirigeant = { nom: agencyExt.dirigeantNom, prenoms: agencyExt.dirigeantPrenoms ?? '' }
      legalFormInsee = agencyExt?.legalForm ?? null
    }

    // Comparaison forme juridique : INSEE (live) vs déclarée par l'entreprise
    // legalFormDeclared = ce que l'entreprise a saisi dans son profil portail
    // legalFormInsee   = valeur officielle data.gouv.fr (via SIREN live ou cache DB)
    const declared = agencyExt?.legalFormDeclared ?? null
    const legalFormMatch: boolean | null =
      legalFormInsee && declared ? legalFormsMatch(legalFormInsee, declared) : null

    return NextResponse.json({
      id: aoCompany.id,
      status: aoCompany.status,
      selectedLotIds: aoCompany.selectedLotIds,
      tokenUsedAt: aoCompany.tokenUsedAt?.toISOString() ?? null,
      offer: aoCompany.offer
        ? {
            submittedAt: aoCompany.offer.submittedAt?.toISOString() ?? null,
            isComplete: aoCompany.offer.isComplete,
          }
        : null,
      adminDocs: aoCompany.adminDocs.map((d) => ({
        id: d.id,
        type: d.type,
        status: d.status,
        rejectionReason: d.rejectionReason,
        expiresAt: d.expiresAt?.toISOString() ?? null,
        fileUrl: d.fileUrl,
      })),
      companyUser: {
        id: companyUser?.id ?? '',
        email: companyUser?.email ?? '',
        firstName: companyUser?.firstName ?? null,
        lastName: companyUser?.lastName ?? null,
        agency: companyUser?.agency ?? null,
      },
      legalFormInsee,
      legalFormMatch,
      dirigeant,
      dirigeantNameMatch,
      activityLogs: activityLogs.map((l) => ({
        id: l.id,
        action: l.action,
        module: l.module,
        createdAt: l.createdAt.toISOString(),
        metadata: l.metadata,
      })),
    })
  } catch (error) {
    console.error('[GET /api/ao/[aoId]/companies/[companyId]]', error)
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
