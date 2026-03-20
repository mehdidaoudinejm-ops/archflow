import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortalAuth } from '@/lib/portal-auth'
import { AuthError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface DataGouvEtablissement {
  siret: string
  unite_legale?: {
    denomination?: string
    prenom_usuel?: string
    nom?: string
    libelle_categorie_juridique?: string
    dirigeants?: Array<{ nom: string; prenoms?: string; prenom_de_naissance?: string }>
  }
  adresse_etablissement?: {
    numero_voie?: string
    type_voie?: string
    libelle_voie?: string
    code_postal?: string
    libelle_commune?: string
  }
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

    const siretToFetch = siret.length === 9
      ? await fetchSiretFromSiren(siret)
      : siret

    if (!siretToFetch) {
      return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 })
    }

    const res = await fetch(
      `https://api.annuaire-entreprises.data.gouv.fr/etablissement/${siretToFetch}`,
      { headers: { Accept: 'application/json' }, next: { revalidate: 0 } }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Entreprise introuvable sur data.gouv.fr' }, { status: 404 })
    }

    const data = await res.json() as DataGouvEtablissement
    const ul = data.unite_legale

    const companyName = ul?.denomination ?? [ul?.prenom_usuel, ul?.nom].filter(Boolean).join(' ') ?? ''
    const legalForm = ul?.libelle_categorie_juridique ?? null

    const addr = data.adresse_etablissement
    const companyAddress = [addr?.numero_voie, addr?.type_voie, addr?.libelle_voie].filter(Boolean).join(' ') || null
    const postalCode = addr?.code_postal ?? null
    const city = addr?.libelle_commune ?? null

    const dirigeants = ul?.dirigeants ?? []
    const dirigeant = dirigeants[0] ?? null

    // Sauvegarder le SIRET vérifié + dirigeant
    if (companyUser.agencyId) {
      await prisma.agency.update({
        where: { id: companyUser.agencyId },
        data: {
          siret: siretToFetch,
          siretVerified: true,
          name: companyName || undefined,
          legalForm: legalForm ?? undefined,
          dirigeantNom: dirigeant?.nom ?? undefined,
          dirigeantPrenoms: dirigeant?.prenoms ?? undefined,
        },
      })
    }

    return NextResponse.json({
      siret: siretToFetch,
      companyName,
      legalForm,
      companyAddress,
      postalCode,
      city,
      dirigeant: dirigeant
        ? { nom: dirigeant.nom, prenoms: dirigeant.prenoms ?? dirigeant.prenom_de_naissance ?? '' }
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

async function fetchSiretFromSiren(siren: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.annuaire-entreprises.data.gouv.fr/entreprise/${siren}`,
      { headers: { Accept: 'application/json' }, next: { revalidate: 0 } }
    )
    if (!res.ok) return null
    const data = await res.json() as { siege?: { siret?: string } }
    return data.siege?.siret ?? null
  } catch {
    return null
  }
}
