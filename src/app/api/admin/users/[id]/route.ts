export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { AdminAuthError, requireAdmin } from '@/lib/admin-auth'
import { logActivity } from '@/lib/activity-log'
import { z } from 'zod'

const ROLES = ['ARCHITECT', 'COLLABORATOR', 'COMPANY', 'CLIENT', 'ADMIN'] as const

const schema = z.object({
  suspended: z.boolean().optional(),
  freeAccess: z.boolean().optional(),
  aiImportLimit: z.number().int().min(0).max(9999).nullable().optional(),
  role: z.enum(ROLES).optional(),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin()

    const body = await req.json()
    const data = schema.parse(body)

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
    })

    await logActivity({
      userId:   session.user.id,
      module:   'admin',
      action:   'update_user',
      metadata: { targetUserId: params.id, changes: data },
    })

    return NextResponse.json(user)
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[PATCH admin/users]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin()

    const userId = params.id

    // Récupérer l'email avant suppression (pour nettoyer la waitlist)
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true } })
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

    // 2. Supprimer de Supabase Auth — chercher par email car l'id Prisma ≠ id Supabase pour les COMPANY
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const rows = await prisma.$queryRaw<[{ id: string }]>`
      SELECT id::text FROM auth.users WHERE email = ${user.email} LIMIT 1
    `
    const supabaseAuthId = rows[0]?.id ?? userId // fallback sur l'id Prisma pour les ARCHITECT

    const { error: supabaseError } = await supabaseAdmin.auth.admin.deleteUser(supabaseAuthId)
    if (supabaseError) {
      console.error('[DELETE user] Supabase Auth error:', supabaseError.message)
      return NextResponse.json({
        ok: true,
        warning: `Prisma supprimé ✓, mais Supabase Auth a retourné une erreur : "${supabaseError.message}". Utilisez "Vérifier" pour confirmer l'état du compte.`,
      })
    }

    await logActivity({
      userId:   session.user.id,
      module:   'admin',
      action:   'delete_user',
      metadata: { targetUserId: userId, targetEmail: user.email, role: user.role },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[DELETE admin/users]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
