export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { AdminAuthError, requireAdmin } from '@/lib/admin-auth'

const BUCKETS = [
  { id: 'admin-docs',    public: true,  fileSizeLimit: 10 * 1024 * 1024 },
  { id: 'dce-documents', public: true,  fileSizeLimit: 50 * 1024 * 1024 },
  { id: 'logos',         public: true,  fileSizeLimit: 2 * 1024 * 1024  },
]

export async function POST() {
  try {
    await requireAdmin()

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const results: { bucket: string; status: 'created' | 'exists' | 'error'; message?: string }[] = []

    for (const bucket of BUCKETS) {
      const { error: createError } = await supabaseAdmin.storage.createBucket(bucket.id, {
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
      })

      if (!createError) {
        results.push({ bucket: bucket.id, status: 'created' })
      } else if (
        createError.message.toLowerCase().includes('already exist') ||
        createError.message.toLowerCase().includes('duplicate')
      ) {
        // Bucket existe — s'assurer qu'il est bien public (il aurait pu être créé privé)
        const { error: updateError } = await supabaseAdmin.storage.updateBucket(bucket.id, {
          public: bucket.public,
          fileSizeLimit: bucket.fileSizeLimit,
        })
        results.push({
          bucket: bucket.id,
          status: 'exists',
          message: updateError ? `existe (update échoué: ${updateError.message})` : 'existe — mis à jour (public: true)',
        })
      } else {
        results.push({ bucket: bucket.id, status: 'error', message: createError.message })
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[POST /api/admin/setup-storage]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
