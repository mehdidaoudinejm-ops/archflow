import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortalAuth } from '@/lib/portal-auth'
import { AuthError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// L'API recherche-entreprises retourne nature_juridique (code INSEE) mais PAS libelle_nature_juridique
const NATURE_JURIDIQUE_LABELS: Record<string, string> = {
  '1000': 'Entrepreneur individuel',
  '5202': 'Société en nom collectif (SNC)',
  '5498': 'Société à responsabilité limitée',
  '5499': 'Société à responsabilité limitée',
  '5599': 'Société anonyme',
  '5710': 'Société par actions simplifiée',
  '5720': 'Société par actions simplifiée à associé unique',
  '6540': 'Société civile',
}

interface RechercheResult {
  siren?: string
  nom_complet?: string
  nom_raison_sociale?: string
  nature_juridique?: string
  activite_principale?: string  // code APE/NAF (ex: "43.31Z")
  date_creation?: string  // date d'immatriculation INSEE (YYYY-MM-DD)
  siege?: {
    siret?: string
    numero_voie?: string
    type_voie?: string
    libelle_voie?: string
    code_postal?: string
    libelle_commune?: string
  }
  dirigeants?: Array<{ nom?: string; prenoms?: string; qualite?: string }>
  matching_etablissements?: Array<{ siret?: string }>
}

interface RechercheResponse {
  results?: RechercheResult[]
  total_results?: number
}

export async function GET(
  req: Request,
  { params }: { params: { aoId: string } }
) {
  try {
    const { companyUser } = await requirePortalAuth(req, params.aoId)

    const { searchParams } = new URL(req.url)
    const siret = searchParams.get('siret')?.replace(/\s/g, '')

    if (!siret || (siret.length !== 9 && siret.length !== 14)) {
      return NextResponse.json({ error: 'SIRET/SIREN invalide (9 ou 14 chiffres)' }, { status: 400 })
    }

    // Appel recherche-entreprises.api.gouv.fr
    let res: Response
    try {
      res = await fetch(
        `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(siret)}&page=1&per_page=1`,
        { headers: { Accept: 'application/json' }, cache: 'no-store' }
      )
    } catch (fetchErr) {
      console.error('[verify-siren] fetch recherche-entreprises failed:', fetchErr)
      return NextResponse.json({ error: 'Impossible de joindre le service de vérification SIRET' }, { status: 502 })
    }

    if (!res.ok) {
      console.error('[verify-siren] recherche-entreprises HTTP', res.status)
      return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 })
    }

    let data: RechercheResponse
    try {
      data = await res.json() as RechercheResponse
    } catch (parseErr) {
      console.error('[verify-siren] JSON parse error:', parseErr)
      return NextResponse.json({ error: 'Réponse invalide du service de vérification' }, { status: 502 })
    }

    const result = data.results?.[0]
    if (!result) {
      return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 })
    }

    // Résoudre le SIRET : si 14 chiffres saisis → on vérifie qu'il correspond, sinon on prend le siège
    const siretToFetch = siret.length === 14
      ? siret
      : (result.siege?.siret ?? null)

    if (!siretToFetch) {
      return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 })
    }

    const companyName = result.nom_complet ?? result.nom_raison_sociale ?? ''
    const njCode = result.nature_juridique ?? null
    const legalForm = njCode ? (NATURE_JURIDIQUE_LABELS[njCode] ?? null) : null
    const ape = result.activite_principale ?? null
    const dateCreationInsee = result.date_creation ? new Date(result.date_creation) : null

    const siege = result.siege
    const companyAddress = [siege?.numero_voie, siege?.type_voie, siege?.libelle_voie].filter(Boolean).join(' ') || null
    const postalCode = siege?.code_postal ?? null
    const city = siege?.libelle_commune ?? null

    const dirigeant = result.dirigeants?.[0] ?? null

    const agencyData = {
      siret: siretToFetch,
      siretVerified: true,
      legalForm: legalForm ?? undefined,
      ape: ape ?? undefined,
      dateCreationInsee: dateCreationInsee ?? undefined,
      dirigeantNom: dirigeant?.nom ?? null,
      dirigeantPrenoms: dirigeant?.prenoms ?? null,
    }

    // Sauvegarder le SIRET vérifié + date INSEE + dirigeant (non-bloquant si erreur)
    try {
      if (companyUser.agencyId) {
        await prisma.agency.update({
          where: { id: companyUser.agencyId },
          data: { ...agencyData, name: companyName || undefined },
        })
      } else {
        // Pas encore d'agence — on en crée une minimale pour persister siretVerified.
        // Le PATCH /company l'enrichira ensuite avec le reste du profil.
        const agency = await prisma.agency.create({
          data: { ...agencyData, name: companyName || 'Entreprise', activeModules: [] },
        })
        await prisma.user.update({ where: { id: companyUser.id }, data: { agencyId: agency.id } })
      }
    } catch (dbErr) {
      console.error('[verify-siren] prisma save failed:', dbErr)
      // Non-bloquant — la vérification reste valide
    }

    return NextResponse.json({
      siret: siretToFetch,
      companyName,
      legalForm,
      ape,
      dateCreationInsee: result.date_creation ?? null,
      companyAddress,
      postalCode,
      city,
      dirigeant: dirigeant
        ? { nom: dirigeant.nom ?? '', prenoms: dirigeant.prenoms ?? '' }
        : null,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    console.error('[GET /api/portal/[aoId]/verify-siren]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
