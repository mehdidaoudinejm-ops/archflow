export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { AdminAuthError, requireAdmin } from '@/lib/admin-auth'

// GET /api/admin/users/sync?email=xxx — vérifie un email spécifique
// GET /api/admin/users/sync         — liste tous les orphelins Prisma
export async function GET(req: Request) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    if (email) {
      // Vérification ciblée d'un email
      const prismaUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, role: true, createdAt: true },
      })

      const authRows = await prisma.$queryRaw<{ id: string; email: string }[]>`
        SELECT id::text, email FROM auth.users WHERE email = ${email} LIMIT 1
      `
      const supabaseUser = authRows[0] ?? null

      return NextResponse.json({
        email,
        prisma: prismaUser
          ? { exists: true, id: prismaUser.id, role: prismaUser.role }
          : { exists: false },
        supabase: supabaseUser
          ? { exists: true, id: supabaseUser.id }
          : { exists: false },
      })
    }

    // Liste globale des orphelins Prisma (pas de compte Supabase Auth)
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true, role: true, createdAt: true },
    })

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

// POST /api/admin/users/sync { email } — force la suppression d'un email dans Prisma + Supabase
export async function POST(req: Request) {
  try {
    await requireAdmin()

    const { email } = await req.json() as { email: string }
    if (!email) return NextResponse.json({ error: 'email requis' }, { status: 400 })

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const results: { prisma: string; supabase: string } = {
      prisma: 'skipped',
      supabase: 'skipped',
    }

    // 1. Supprimer de Prisma
    const prismaUser = await prisma.user.findUnique({ where: { email } })
    if (prismaUser) {
      await prisma.$transaction([
        prisma.projectPermission.deleteMany({ where: { userId: prismaUser.id } }),
        prisma.notification.deleteMany({ where: { userId: prismaUser.id } }),
        prisma.activityLog.deleteMany({ where: { userId: prismaUser.id } }),
        prisma.user.delete({ where: { id: prismaUser.id } }),
      ])
      results.prisma = 'deleted'
    } else {
      results.prisma = 'not_found'
    }

    // 2. Supprimer de Supabase Auth
    const authRows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id::text FROM auth.users WHERE email = ${email} LIMIT 1
    `
    const supabaseAuthId = authRows[0]?.id
    if (supabaseAuthId) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(supabaseAuthId)
      results.supabase = error ? `error: ${error.message}` : 'deleted'
    } else {
      results.supabase = 'not_found'
    }

    return NextResponse.json({ ok: true, results })
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[POST /api/admin/users/sync]', error)
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
