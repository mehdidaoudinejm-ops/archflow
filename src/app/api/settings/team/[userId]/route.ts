export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { requireRole, AuthError } from '@/lib/auth'

export async function DELETE(
  _req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const currentUser = await requireRole(['ARCHITECT'])

    if (!currentUser.agencyId) {
      return NextResponse.json({ error: 'Agence introuvable' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true, email: true, agencyId: true, role: true },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    // Can only remove members of own agency
    if (targetUser.agencyId !== currentUser.agencyId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Cannot remove self
    if (targetUser.id === currentUser.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas vous retirer vous-même' }, { status: 400 })
    }

    // Cannot remove another ARCHITECT
    if (targetUser.role === 'ARCHITECT') {
      return NextResponse.json({ error: 'Impossible de retirer un architecte' }, { status: 400 })
    }

    // Detach from agency (keep the user record but remove agencyId)
    await prisma.user.update({
      where: { id: params.userId },
      data: { agencyId: null },
    })

    // Delete Supabase Auth account for the collaborator
    try {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
      const rows = await prisma.$queryRaw<[{ id: string }]>`
        SELECT id::text FROM auth.users WHERE email = ${targetUser.email} LIMIT 1
      `
      const supabaseAuthId = rows[0]?.id
      if (supabaseAuthId) {
        await supabaseAdmin.auth.admin.deleteUser(supabaseAuthId)
      }
    } catch (err) {
      console.error('[DELETE team member] Supabase cleanup error:', err)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('[DELETE /api/settings/team/[userId]]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
