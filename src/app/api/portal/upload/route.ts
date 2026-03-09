export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePortalAuth } from '@/lib/portal-auth'
import { AuthError } from '@/lib/auth'

const MAX_SIZE = 10 * 1024 * 1024 // 10 Mo

export async function POST(req: Request) {
  try {
    // Vérifier l'auth portail (token JWT dans X-Portal-Token ou Authorization)
    const url = new URL(req.url)
    const aoId = url.searchParams.get('aoId')
    if (!aoId) {
      return NextResponse.json({ error: 'aoId manquant' }, { status: 400 })
    }

    await requirePortalAuth(req, aoId)

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const bucket = (formData.get('bucket') as string | null) ?? 'admin-docs'
    const path = formData.get('path') as string | null

    if (!file || !path) {
      return NextResponse.json({ error: 'file et path sont requis' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo)' }, { status: 400 })
    }

    // Upload via service role — bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Créer le bucket s'il n'existe pas encore (idempotent)
    const { error: bucketErr } = await supabaseAdmin.storage.createBucket(bucket, { public: true })
    if (bucketErr && !bucketErr.message.toLowerCase().includes('already exist') && !bucketErr.message.toLowerCase().includes('duplicate')) {
      console.warn('[portal/upload] createBucket warning:', bucketErr.message)
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      })

    if (error) {
      console.error('[portal/upload] Storage error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(data.path)

    return NextResponse.json({ fileUrl: urlData.publicUrl }, { status: 200 })
  } catch (error) {
    console.error('[POST /api/portal/upload]', error)
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
