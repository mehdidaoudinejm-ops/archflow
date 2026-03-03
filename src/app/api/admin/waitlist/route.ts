import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import { DirectAccountEmail } from '@/emails/DirectAccountEmail'
import React from 'react'
import { randomBytes } from 'crypto'

export async function GET() {
  try {
    const session = await requireAdmin()
    if (!session) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const entries = await prisma.waitlistEntry.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error('[GET /api/admin/waitlist]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST : créer un compte ARCHITECT directement sans waitlist
const directCreateSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  agencyName: z.string().min(1).max(100),
})

export async function POST(req: Request) {
  try {
    const session = await requireAdmin()
    if (!session) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const body: unknown = await req.json()
    const parsed = directCreateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 422 })

    const { firstName, lastName, email, agencyName } = parsed.data

    // Vérifier si l'email existe déjà
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: 'Un compte existe déjà avec cet email' }, { status: 409 })

    // Générer un mot de passe temporaire
    const tempPassword = randomBytes(8).toString('hex')

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    })

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    const agency = await prisma.agency.create({
      data: { name: agencyName, plan: 'SOLO', activeModules: ['dpgf'] },
    })

    await prisma.user.create({
      data: { agencyId: agency.id, email, role: 'ARCHITECT', firstName, lastName },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://archflow.fr'

    await sendEmail({
      to: email,
      subject: 'Votre accès ArchFlow est prêt',
      react: React.createElement(DirectAccountEmail, {
        firstName,
        email,
        tempPassword,
        loginUrl: `${appUrl}/login`,
      }),
    })

    return NextResponse.json({ success: true, tempPassword }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/waitlist]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
