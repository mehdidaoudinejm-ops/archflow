import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

const registerSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis').max(50),
  lastName: z.string().min(1, 'Nom requis').max(50),
  agencyName: z.string().min(1, 'Nom de l\'agence requis').max(100),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
})

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const { firstName, lastName, agencyName, email, password } = parsed.data

    // Vérifier si l'email est déjà pris dans Prisma
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Un compte existe déjà avec cet email' },
        { status: 409 }
      )
    }

    // 1. Créer le compte Supabase Auth (admin — email confirmé immédiatement)
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
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // 2. Créer l'agence Prisma
    const agency = await prisma.agency.create({
      data: {
        name: agencyName,
        plan: 'SOLO',
        activeModules: ['dpgf'],
      },
    })

    // 3. Créer l'utilisateur Prisma lié à l'agence
    await prisma.user.create({
      data: {
        agencyId: agency.id,
        email,
        role: 'ARCHITECT',
        firstName,
        lastName,
      },
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/auth/register]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
