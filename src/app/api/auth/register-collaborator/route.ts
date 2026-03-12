export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { verifyCollaboratorToken } from '@/lib/collaborator-invite'

const schema = z.object({
  token: z.string().min(1, 'Token requis'),
  firstName: z.string().min(1, 'Prénom requis').max(50),
  lastName: z.string().min(1, 'Nom requis').max(50),
  password: z.string().min(8, 'Minimum 8 caractères'),
})

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Données invalides' },
        { status: 422 }
      )
    }

    const { token, firstName, lastName, password } = parsed.data

    // 1. Verify token
    let tokenPayload: { email: string; agencyId: string; invitedById: string }
    try {
      tokenPayload = await verifyCollaboratorToken(token)
    } catch {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 400 })
    }

    const { email, agencyId } = tokenPayload

    // 2. Check agency still exists
    const agency = await prisma.agency.findUnique({ where: { id: agencyId } })
    if (!agency) {
      return NextResponse.json({ error: 'Cette invitation n\'est plus valide' }, { status: 400 })
    }

    // 3. Check placeholder user exists
    const placeholderUser = await prisma.user.findUnique({ where: { email } })
    if (!placeholderUser) {
      return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 })
    }

    // Already registered
    if (placeholderUser.agencyId) {
      return NextResponse.json({ error: 'Ce compte est déjà activé' }, { status: 409 })
    }

    // 4. Create Supabase Auth account
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      if (authError.message.toLowerCase().includes('already')) {
        // Already exists — update password
        const rows = await prisma.$queryRaw<[{ id: string }]>`
          SELECT id::text FROM auth.users WHERE email = ${email} LIMIT 1
        `
        const supabaseUserId = rows[0]?.id
        if (supabaseUserId) {
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            supabaseUserId,
            { password, email_confirm: true }
          )
          if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 400 })
          }
        }
      } else {
        return NextResponse.json({ error: authError.message }, { status: 400 })
      }
    }

    // 5. Update placeholder user with real data
    await prisma.user.update({
      where: { id: placeholderUser.id },
      data: {
        firstName,
        lastName,
        agencyId,
        role: 'COLLABORATOR',
      },
    })

    return NextResponse.json({ success: true, email }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/auth/register-collaborator]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
