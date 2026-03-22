export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePortalAuth } from '@/lib/portal-auth'
import { AuthError } from '@/lib/auth'

const MAX_SIZE = 10 * 1024 * 1024 // 10 Mo

// Extensions autorisées pour les documents administratifs entreprise
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.xlsx']

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
    const path = formData.get('path') as string | null

    // Le bucket est toujours admin-docs pour les uploads portail entreprise
    const bucket = 'admin-docs'

    if (!file || !path) {
      return NextResponse.json({ error: 'file et path sont requis' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo)' }, { status: 400 })
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: 'Format non autorisé' }, { status: 400 })
    }

    // Upload via service role — bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // admin-docs est privé (accès via signed URL côté archi) ; dce-documents/logos sont publics
    const isPrivateBucket = bucket === 'admin-docs'
    const { error: bucketErr } = await supabaseAdmin.storage.createBucket(bucket, { public: !isPrivateBucket })
    if (bucketErr) {
      if (bucketErr.message.toLowerCase().includes('already exist') || bucketErr.message.toLowerCase().includes('duplicate')) {
        await supabaseAdmin.storage.updateBucket(bucket, { public: !isPrivateBucket })
      } else {
        console.warn('[portal/upload] createBucket warning:', bucketErr.message)
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // MIME type dérivé de l'extension — ne pas faire confiance à file.type (client-contrôlé)
    const MIME_MAP: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }
    const contentType = MIME_MAP[ext] ?? 'application/octet-stream'

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType,
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
