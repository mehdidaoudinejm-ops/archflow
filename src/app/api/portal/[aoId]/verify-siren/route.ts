import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortalAuth } from '@/lib/portal-auth'
import { AuthError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface RechercheResult {
  siren?: string
  nom_complet?: string
  nom_raison_sociale?: string
  nature_juridique?: string
  libelle_nature_juridique?: string
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
    const legalForm = result.libelle_nature_juridique ?? null

    const siege = result.siege
    const companyAddress = [siege?.numero_voie, siege?.type_voie, siege?.libelle_voie].filter(Boolean).join(' ') || null
    const postalCode = siege?.code_postal ?? null
    const city = siege?.libelle_commune ?? null

    const dirigeant = result.dirigeants?.[0] ?? null

    // Sauvegarder le SIRET vérifié + dirigeant (non-bloquant si erreur)
    if (companyUser.agencyId) {
      try {
        await prisma.agency.update({
          where: { id: companyUser.agencyId },
          data: {
            siret: siretToFetch,
            siretVerified: true,
            name: companyName || undefined,
            legalForm: legalForm ?? undefined,
            dirigeantNom: dirigeant?.nom ?? null,
            dirigeantPrenoms: dirigeant?.prenoms ?? null,
          },
        })
      } catch (dbErr) {
        console.error('[verify-siren] prisma.agency.update failed:', dbErr)
        // Non-bloquant — la vérification reste valide
      }
    }

    return NextResponse.json({
      siret: siretToFetch,
      companyName,
      legalForm,
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
