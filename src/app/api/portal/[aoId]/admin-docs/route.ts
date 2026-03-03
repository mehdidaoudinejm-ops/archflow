import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortalAuth } from '@/lib/portal-auth'
import { AuthError } from '@/lib/auth'
import { adminDocSchema } from '@/lib/validations/offer'

export const dynamic = 'force-dynamic'

// GET — Liste des documents administratifs de l'entreprise pour cet AO
export async function GET(
  req: Request,
  { params }: { params: { aoId: string } }
) {
  try {
    const { aoCompany } = await requirePortalAuth(req, params.aoId)

    const adminDocs = await prisma.adminDoc.findMany({
      where: { aoCompanyId: aoCompany.id },
      orderBy: { id: 'asc' },
    })

    return NextResponse.json(adminDocs, { status: 200 })
  } catch (error) {
    console.error('[GET /api/portal/[aoId]/admin-docs]', error)
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST — Enregistrer un document administratif après upload Supabase Storage
export async function POST(
  req: Request,
  { params }: { params: { aoId: string } }
) {
  try {
    const { aoCompany } = await requirePortalAuth(req, params.aoId)

    const body: unknown = await req.json()
    const parsed = adminDocSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const { type, fileUrl } = parsed.data

    // Créer le document (ou remplacer le plus récent du même type)
    const adminDoc = await prisma.adminDoc.create({
      data: {
        aoCompanyId: aoCompany.id,
        type,
        fileUrl,
        status: 'PENDING',
      },
    })

    return NextResponse.json(adminDoc, { status: 201 })
  } catch (error) {
    console.error('[POST /api/portal/[aoId]/admin-docs]', error)
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
