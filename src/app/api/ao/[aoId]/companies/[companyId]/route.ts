import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ── Normalisation forme juridique ────────────────────────────────────────────

function normalizeLF(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
}

// Abréviations → fragment attendu dans la valeur INSEE complète
const LEGAL_ABBREV: Record<string, string> = {
  sarl: 'responsabilitelimitee',
  sas:  'actionsimplifiee',
  sasu: 'actionsimplifieeunipersonnelle',
  sa:   'societeanonyme',
  eurl: 'unipersonnelleresponsabilitelimitee',
  sci:  'civilimmobiliere',
  snc:  'nomcollectif',
  ei:   'entrepreneurindividuel',
  scp:  'civileprofessionnelle',
  sel:  'exerciceliberal',
}

function legalFormsMatch(insee: string, declared: string): boolean {
  const ni = normalizeLF(insee)
  const nd = normalizeLF(declared)
  if (ni === nd) return true
  // Contient seulement pour les chaînes longues (évite les faux positifs sur "sa", "ei"…)
  if (nd.length >= 8 && (ni.includes(nd) || nd.includes(ni))) return true
  // Résolution d'abréviation
  const fragment = LEGAL_ABBREV[nd]
  if (fragment && ni.includes(fragment)) return true
  return false
}

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: { aoId: string; companyId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    const ao = await prisma.aO.findUnique({
      where: { id: params.aoId },
      include: { dpgf: { include: { project: { select: { agencyId: true } } } } },
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
            id: true, name: true, siret: true, siretVerified: true,
            legalForm: true, legalFormDeclared: true,
            dateCreationInsee: true, companyAddress: true, postalCode: true,
            city: true, phone: true, trade: true, signatoryQuality: true,
            dirigeantNom: true, dirigeantPrenoms: true,
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

    // Typage étendu de l'agence
    type AgencyExt = {
      siret?: string | null
      siretVerified?: boolean
      legalForm?: string | null
      legalFormDeclared?: string | null
      dirigeantNom?: string | null
      dirigeantPrenoms?: string | null
    }
    const agency = companyUser?.agency as (AgencyExt | null)

    // ── Fetch data.gouv.fr (non-bloquant, timeout 3s) ────────────────────────
    let legalFormInsee: string | null = null
    let dirigeant: { nom: string; prenoms: string } | null = null
    let dirigeantNameMatch: boolean | null = null

    const siret = agency?.siret ?? null

    if (siret && siret.length >= 9) {
      const siren = siret.slice(0, 9)
      try {
        const res = await fetch(
          `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(siren)}&per_page=1`,
          { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(3000) }
        )
        if (res.ok) {
          const data = await res.json() as {
            results?: Array<{
              libelle_nature_juridique?: string
              dirigeants?: Array<{ nom?: string; prenoms?: string }>
            }>
          }
          const result = data.results?.[0]
          legalFormInsee = result?.libelle_nature_juridique ?? null

          const govDir = result?.dirigeants?.[0]
          if (govDir?.nom) {
            dirigeant = { nom: govDir.nom, prenoms: govDir.prenoms ?? '' }
            const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
            const govLast = norm(dirigeant.nom)
            const sigLast = norm(companyUser?.lastName ?? '')
            if (govLast && sigLast) {
              const lastMatch = govLast === sigLast
              if (lastMatch) {
                const govFirst = norm(dirigeant.prenoms)
                const sigFirst = norm(companyUser?.firstName ?? '')
                dirigeantNameMatch = !govFirst || !sigFirst
                  ? true
                  : govFirst.includes(sigFirst) || sigFirst.includes(govFirst)
              } else {
                dirigeantNameMatch = false
              }
            }
          }
        }
      } catch {
        // Timeout ou erreur réseau — fallback silencieux sur les données DB
      }

      // Fallback DB si le fetch n'a rien retourné
      if (!legalFormInsee) {
        legalFormInsee = agency?.legalForm ?? null
      }
      if (!dirigeant && agency?.siretVerified && agency.dirigeantNom) {
        dirigeant = { nom: agency.dirigeantNom, prenoms: agency.dirigeantPrenoms ?? '' }
      }
    } else if (agency?.siretVerified) {
      // Pas de SIRET renseigné, mais données vérifiées stockées en DB
      legalFormInsee = agency?.legalForm ?? null
      if (agency.dirigeantNom) {
        dirigeant = { nom: agency.dirigeantNom, prenoms: agency.dirigeantPrenoms ?? '' }
      }
    }

    // ── Comparaison forme juridique ──────────────────────────────────────────
    // declared = ce que l'entreprise a déclaré sur le portail
    //            (legalFormDeclared en priorité, sinon legalForm comme fallback)
    const declared = agency?.legalFormDeclared ?? agency?.legalForm ?? null
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
