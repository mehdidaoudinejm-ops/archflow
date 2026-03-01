import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { verifyInviteToken } from '@/lib/invite'

const registerCompanySchema = z.object({
  token: z.string().min(1, 'Token requis'),
  firstName: z.string().min(1, 'Prénom requis').max(50),
  lastName: z.string().min(1, 'Nom requis').max(50),
  companyName: z.string().min(1, 'Nom de la société requis').max(100),
  password: z.string().min(8, 'Minimum 8 caractères'),
})

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json()
    const parsed = registerCompanySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const { token, firstName, lastName, companyName, password } = parsed.data

    // 1. Vérifier le token JWT
    let tokenPayload: { email: string; aoId: string; aoCompanyId: string }
    try {
      tokenPayload = await verifyInviteToken(token)
    } catch {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 400 })
    }

    const { email, aoCompanyId } = tokenPayload

    // 2. Vérifier que l'AOCompany existe et que le token n'a pas été utilisé
    const aoCompany = await prisma.aOCompany.findFirst({
      where: { id: aoCompanyId, inviteToken: token },
    })

    if (!aoCompany) {
      return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 })
    }

    if (aoCompany.tokenUsedAt) {
      return NextResponse.json({ error: 'Ce lien a déjà été utilisé' }, { status: 400 })
    }

    // 3. Vérifier que l'utilisateur placeholder existe bien
    const placeholderUser = await prisma.user.findUnique({ where: { email } })
    if (!placeholderUser) {
      return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 })
    }

    // 4. Créer le compte Supabase Auth
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
      // Si l'utilisateur Supabase existe déjà (invitation re-envoyée), ignorer
      if (!authError.message.includes('already')) {
        return NextResponse.json({ error: authError.message }, { status: 400 })
      }
    }

    // 5. Créer l'agence pour la société
    const agency = await prisma.agency.create({
      data: {
        name: companyName,
        plan: 'SOLO',
        activeModules: [],
      },
    })

    // 6. Mettre à jour l'utilisateur placeholder avec les vraies infos
    await prisma.user.update({
      where: { id: placeholderUser.id },
      data: {
        firstName,
        lastName,
        agencyId: agency.id,
      },
    })

    // 7. Marquer le token comme utilisé
    await prisma.aOCompany.update({
      where: { id: aoCompanyId },
      data: { tokenUsedAt: new Date() },
    })

    return NextResponse.json({ success: true, email }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/auth/register-company]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
