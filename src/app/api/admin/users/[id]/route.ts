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

    // Supprimer de Prisma (cascade sur les relations)
    await prisma.user.delete({ where: { id: params.id } })

    // Supprimer de Supabase Auth (id Prisma = id Supabase)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    await supabaseAdmin.auth.admin.deleteUser(params.id)

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
