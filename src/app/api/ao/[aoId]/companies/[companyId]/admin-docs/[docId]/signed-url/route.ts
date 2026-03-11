export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const BUCKET = 'admin-docs'
const EXPIRES_IN = 60 // secondes

export async function GET(
  _req: Request,
  { params }: { params: { aoId: string; companyId: string; docId: string } }
) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR'])

    // Vérifier que l'AO appartient à l'agence de l'utilisateur
    const ao = await prisma.aO.findUnique({
      where: { id: params.aoId },
      include: { dpgf: { include: { project: { select: { agencyId: true } } } } },
    })
    if (!ao || ao.dpgf.project.agencyId !== user.agencyId) {
      return NextResponse.json({ error: 'AO introuvable' }, { status: 404 })
    }

    // Vérifier que l'entreprise appartient à cet AO
    const aoCompany = await prisma.aOCompany.findUnique({ where: { id: params.companyId } })
    if (!aoCompany || aoCompany.aoId !== params.aoId) {
      return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 })
    }

    // Vérifier que le document appartient à cette entreprise
    const doc = await prisma.adminDoc.findUnique({ where: { id: params.docId } })
    if (!doc || doc.aoCompanyId !== params.companyId) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    }

    // Extraire le path depuis fileUrl
    // fileUrl: https://xxx.supabase.co/storage/v1/object/public/admin-docs/{path}
    //       or https://xxx.supabase.co/storage/v1/object/sign/admin-docs/{path}?token=...
    const fileUrl = doc.fileUrl
    const publicMarker = `/object/public/${BUCKET}/`
    const signMarker = `/object/sign/${BUCKET}/`

    let storagePath: string | null = null
    if (fileUrl.includes(publicMarker)) {
      storagePath = fileUrl.split(publicMarker)[1]
    } else if (fileUrl.includes(signMarker)) {
      storagePath = fileUrl.split(signMarker)[1].split('?')[0]
    }

    if (!storagePath) {
      return NextResponse.json({ error: 'URL de fichier invalide' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, EXPIRES_IN)

    if (error || !data?.signedUrl) {
      console.error('[signed-url] Supabase error:', error?.message)
      return NextResponse.json({ error: 'Impossible de générer le lien' }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl })
  } catch (error) {
    console.error('[GET signed-url]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
