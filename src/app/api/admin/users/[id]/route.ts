export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { AdminAuthError, requireAdmin } from '@/lib/admin-auth'
import { z } from 'zod'

const schema = z.object({
  suspended: z.boolean().optional(),
  freeAccess: z.boolean().optional(),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()

    const body = await req.json()
    const data = schema.parse(body)

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json(user)
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()

    const userId = params.id

    // Récupérer l'email avant suppression (pour nettoyer la waitlist)
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    // 1. Supprimer toutes les relations en transaction (ordre FK)
    await prisma.$transaction([
      prisma.projectPermission.deleteMany({ where: { userId } }),
      prisma.notification.deleteMany({ where: { userId } }),
      prisma.activityLog.deleteMany({ where: { userId } }),
      prisma.waitlistEntry.deleteMany({ where: { email: user.email } }),
      prisma.user.delete({ where: { id: userId } }),
    ])

    // 2. Supprimer de Supabase Auth (id Prisma = id Supabase Auth)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error: supabaseError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (supabaseError) {
      // Prisma supprimé, Supabase échoué — on log mais on ne bloque pas
      console.error('[DELETE user] Supabase Auth error:', supabaseError.message)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[DELETE user]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
