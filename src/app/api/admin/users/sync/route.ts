export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { AdminAuthError, requireAdmin } from '@/lib/admin-auth'

// GET /api/admin/users/sync — retourne la liste des orphelins Prisma (pas de compte Supabase Auth)
export async function GET() {
  try {
    await requireAdmin()

    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true, role: true, createdAt: true },
    })

    // Récupérer tous les emails présents dans auth.users
    const authRows = await prisma.$queryRaw<{ email: string }[]>`
      SELECT email FROM auth.users
    `
    const authEmails = new Set(authRows.map((r) => r.email))

    const orphans = allUsers.filter((u) => !authEmails.has(u.email))

    return NextResponse.json({ orphans })
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[GET /api/admin/users/sync]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/admin/users/sync — supprime tous les orphelins Prisma
export async function DELETE() {
  try {
    await requireAdmin()

    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true, role: true },
    })

    const authRows = await prisma.$queryRaw<{ email: string }[]>`
      SELECT email FROM auth.users
    `
    const authEmails = new Set(authRows.map((r) => r.email))

    const orphans = allUsers.filter((u) => !authEmails.has(u.email))

    let deleted = 0
    for (const orphan of orphans) {
      try {
        await prisma.$transaction([
          prisma.projectPermission.deleteMany({ where: { userId: orphan.id } }),
          prisma.notification.deleteMany({ where: { userId: orphan.id } }),
          prisma.activityLog.deleteMany({ where: { userId: orphan.id } }),
          prisma.user.delete({ where: { id: orphan.id } }),
        ])
        deleted++
      } catch (err) {
        console.error(`[sync] Failed to delete orphan ${orphan.email}:`, err)
      }
    }

    return NextResponse.json({ deleted, total: orphans.length })
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[DELETE /api/admin/users/sync]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
