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
      const { error } = await supabaseAdmin.storage.createBucket(bucket.id, {
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
      })

      if (!error) {
        results.push({ bucket: bucket.id, status: 'created' })
      } else if (
        error.message.toLowerCase().includes('already exist') ||
        error.message.toLowerCase().includes('duplicate')
      ) {
        results.push({ bucket: bucket.id, status: 'exists' })
      } else {
        results.push({ bucket: bucket.id, status: 'error', message: error.message })
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
