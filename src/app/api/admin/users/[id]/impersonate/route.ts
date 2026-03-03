import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin()
    if (!session) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const user = await prisma.user.findUnique({ where: { id: params.id } })
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://archflow.fr'

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
      options: {
        redirectTo: `${appUrl}/dashboard?__impersonating=${encodeURIComponent(user.email)}`,
      },
    })

    if (error || !data?.properties?.action_link) {
      return NextResponse.json({ error: 'Impossible de générer le lien' }, { status: 500 })
    }

    return NextResponse.json({ url: data.properties.action_link, email: user.email })
  } catch (error) {
    console.error('[POST /api/admin/users/[id]/impersonate]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
