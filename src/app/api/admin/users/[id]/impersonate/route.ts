export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { AdminAuthError, requireAdmin } from '@/lib/admin-auth'
import { logActivity } from '@/lib/activity-log'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin()

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { email: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/dashboard`,
      },
    })

    if (error || !data.properties?.action_link) {
      return NextResponse.json({ error: 'Impossible de générer le lien' }, { status: 500 })
    }

    await logActivity({
      userId:   session.user.id,
      module:   'admin',
      action:   'impersonate_user',
      metadata: { targetUserId: params.id, targetEmail: user.email },
    })

    return NextResponse.json({ url: data.properties.action_link })
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[impersonate]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
