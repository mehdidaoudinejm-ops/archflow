export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MAX_SIZE = 2 * 1024 * 1024 // 2 Mo
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']

export async function POST(req: Request) {
  try {
    const user = await requireRole(['ARCHITECT', 'COLLABORATOR', 'COMPANY'])

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Fichier trop volumineux (max 2 Mo)' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Format non supporté (PNG, JPG, SVG, WebP)' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const ext = file.name.split('.').pop() ?? 'png'
    const path = `${user.agencyId ?? user.id}/logo.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { data, error } = await supabaseAdmin.storage
      .from('logos')
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (error) {
      console.error('[upload/logo] Storage error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage.from('logos').getPublicUrl(data.path)
    const logoUrl = urlData.publicUrl

    // Sauvegarder en base
    if (user.agencyId) {
      await prisma.agency.update({ where: { id: user.agencyId }, data: { logoUrl } })
    }

    return NextResponse.json({ logoUrl }, { status: 200 })
  } catch (error) {
    if (error instanceof Error && error.name === 'AuthError') {
      return NextResponse.json({ error: (error as { message: string }).message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
