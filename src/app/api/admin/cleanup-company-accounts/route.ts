import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    await requireAdmin()

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get all COMPANY users
    const companyUsers = await prisma.user.findMany({
      where: { role: 'COMPANY' },
      select: { id: true, email: true },
    })

    if (companyUsers.length === 0) {
      return NextResponse.json({ deleted: 0, message: 'Aucun compte entreprise trouvé' })
    }

    const emails = companyUsers.map((u) => u.email)

    // Find Supabase Auth accounts by email via $queryRaw
    const authUsers = await prisma.$queryRaw<{ id: string; email: string }[]>`
      SELECT id::text, email FROM auth.users WHERE email = ANY(${emails})
    `

    let deleted = 0
    const errors: string[] = []

    for (const authUser of authUsers) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(authUser.id)
      if (error) {
        errors.push(`${authUser.email}: ${error.message}`)
      } else {
        deleted++
      }
    }

    return NextResponse.json({
      total: authUsers.length,
      deleted,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('[POST /api/admin/cleanup-company-accounts]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
