import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const registerSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis').max(50),
  lastName: z.string().min(1, 'Nom requis').max(50),
  agencyName: z.string().min(1, "Nom de l'agence requis").max(100),
  city: z.string().min(1, 'Ville requise').max(100),
  phone: z.string().max(30).optional(),
  password: z.string().min(8, 'Minimum 8 caractères'),
  inviteToken: z.string().min(1, "Token d'invitation requis"),
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

    const { firstName, lastName, agencyName, city, phone, password, inviteToken } = parsed.data

    // Valider + invalider le token atomiquement (évite double-création par requêtes concurrentes)
    const entry = await prisma.$transaction(async (tx) => {
      const found = await tx.waitlistEntry.findUnique({ where: { inviteToken } })

      if (!found || found.status !== 'APPROVED') return null

      // Vérifier l'expiration (7 jours)
      if (found.approvedAt) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        if (found.approvedAt < sevenDaysAgo) return null
      }

      // Consommer le token immédiatement — requête concurrente trouvera inviteToken=null
      await tx.waitlistEntry.update({
        where: { id: found.id },
        data: { inviteToken: null },
      })

      return found
    })

    if (!entry) {
      return NextResponse.json(
        { error: "Invitation invalide ou expirée" },
        { status: 403 }
      )
    }

    const email = entry.email

    // Vérifier si un compte Prisma existe déjà
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Un compte existe déjà avec cet email' },
        { status: 409 }
      )
    }

    // Créer le compte Supabase Auth
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

    // Créer l'agence Prisma
    const agency = await prisma.agency.create({
      data: {
        name: agencyName,
        city: city,
        phone: phone ?? null,
        plan: 'SOLO',
        activeModules: ['dpgf'],
      },
    })

    // Créer l'utilisateur Prisma
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
