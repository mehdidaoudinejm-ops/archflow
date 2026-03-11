import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { verifyInviteToken } from '@/lib/invite'

export const dynamic = 'force-dynamic'

const registerCompanySchema = z.object({
  token: z.string().min(1, 'Token requis'),
  firstName: z.string().min(1, 'Prénom requis').max(50),
  lastName: z.string().min(1, 'Nom requis').max(50),
  companyName: z.string().min(1, 'Nom de la société requis').max(100),
  password: z.string().min(8, 'Minimum 8 caractères'),
  siret: z.string().length(14, 'Le SIRET est obligatoire (14 chiffres)'),
  legalForm: z.string().max(50).optional(),
  companyAddress: z.string().max(200).optional(),
  postalCode: z.string().max(10).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  trade: z.string().max(50).optional(),
  signatoryQuality: z.string().max(50).optional(),
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

    const { token, firstName, lastName, companyName, password, siret, legalForm, companyAddress, postalCode, city, country, phone, trade, signatoryQuality } = parsed.data

    // 1. Vérifier le token JWT
    let tokenPayload: { email: string; aoId: string; aoCompanyId: string }
    try {
      tokenPayload = await verifyInviteToken(token)
    } catch {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 400 })
    }

    const { aoCompanyId } = tokenPayload
    const isDev = process.env.NODE_ENV === 'development'

    // 2. Vérifier que l'AOCompany existe
    const aoCompany = await prisma.aOCompany.findUnique({
      where: { id: aoCompanyId },
    })

    if (!aoCompany) {
      console.error('[register-company] AOCompany introuvable, id JWT:', aoCompanyId)
      return NextResponse.json(
        { error: 'Invitation introuvable', ...(isDev && { debug: `AOCompany id=${aoCompanyId} absent en base` }) },
        { status: 404 }
      )
    }

    // Vérifier que le token correspond (si inviteToken est renseigné)
    if (aoCompany.inviteToken && aoCompany.inviteToken !== token) {
      console.error('[register-company] Token mismatch, aoCompanyId:', aoCompanyId)
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 400 })
    }

    if (aoCompany.tokenUsedAt) {
      return NextResponse.json({ error: 'Ce lien a déjà été utilisé' }, { status: 400 })
    }

    // 3. Récupérer l'utilisateur lié à cet AOCompany
    const placeholderUser = await prisma.user.findUnique({ where: { id: aoCompany.companyUserId } })
    if (!placeholderUser) {
      console.error('[register-company] User introuvable, companyUserId:', aoCompany.companyUserId)
      return NextResponse.json(
        { error: 'Ce lien n\'est plus valide. Contactez l\'agence pour recevoir une nouvelle invitation.' },
        { status: 404 }
      )
    }
    const email = placeholderUser.email

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
      if (authError.message.toLowerCase().includes('already')) {
        // Compte Supabase déjà existant — trouver l'ID et mettre à jour le mot de passe
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

    // 5. Vérifier le SIRET via recherche-entreprises.api.gouv.fr (gratuite, sans auth)
    // On cherche par SIREN (9 premiers chiffres) car la recherche par SIRET complet
    // ne retourne rien pour les établissements secondaires (non-siège).
    let siretVerified = false
    if (siret && siret.length === 14) {
      try {
        const siren = siret.slice(0, 9)
        const sireneRes = await fetch(
          `https://recherche-entreprises.api.gouv.fr/search?q=${siren}&per_page=1`,
          { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(6000) }
        )
        if (sireneRes.ok) {
          const data = await sireneRes.json() as {
            results?: Array<{ siren?: string; siege?: { etat_administratif?: string } }>
          }
          const company = data.results?.[0]
          // Vérifier que le SIREN retourné correspond exactement + que l'entreprise est active
          if (company?.siren === siren) {
            siretVerified = company.siege?.etat_administratif === 'A'
          }
          console.log('[register-company] SIRET check — siren:', siren, '| found siren:', company?.siren, '| etat:', company?.siege?.etat_administratif, '| verified:', siretVerified)
        }
      } catch (err) {
        // API indisponible — continuer sans vérification
        console.warn('[register-company] SIRET API indisponible:', err)
      }
    }

    // 6. Créer l'agence pour la société
    const agency = await prisma.agency.create({
      data: {
        name: companyName,
        plan: 'SOLO',
        activeModules: [],
        siret: siret ?? null,
        siretVerified,
        legalForm: legalForm ?? null,
        companyAddress: companyAddress ?? null,
        postalCode: postalCode ?? null,
        city: city ?? null,
        country: country ?? 'France',
        phone: phone ?? null,
        trade: trade ?? null,
        signatoryQuality: signatoryQuality ?? null,
      },
    })

    // 7. Mettre à jour l'utilisateur placeholder avec les vraies infos
    await prisma.user.update({
      where: { id: placeholderUser.id },
      data: {
        firstName,
        lastName,
        agencyId: agency.id,
      },
    })

    // 8. Marquer le token comme utilisé
    await prisma.aOCompany.update({
      where: { id: aoCompanyId },
      data: { tokenUsedAt: new Date() },
    })

    // 9. Ajouter automatiquement l'entreprise à l'annuaire de l'architecte
    try {
      const ao = await prisma.aO.findUnique({
        where: { id: aoCompany.aoId },
        include: { dpgf: { include: { project: { select: { agencyId: true } } } } },
      })
      const architectAgencyId = ao?.dpgf?.project?.agencyId ?? null
      console.log('[register-company] annuaire — aoId:', aoCompany.aoId, 'architectAgencyId:', architectAgencyId)

      if (architectAgencyId) {
        const existingContact = await prisma.contact.findFirst({
          where: { agencyId: architectAgencyId, email, type: 'ENTREPRISE' },
        })
        if (!existingContact) {
          const created = await prisma.contact.create({
            data: {
              agencyId: architectAgencyId,
              type: 'ENTREPRISE',
              firstName,
              lastName,
              email,
              phone: phone ?? null,
              company: companyName,
              address: [companyAddress, postalCode, city].filter(Boolean).join(', ') || null,
              notes: siret ? `SIRET: ${siret}` : null,
            },
          })
          console.log('[register-company] contact créé dans annuaire:', created.id)
        } else {
          console.log('[register-company] contact déjà présent dans annuaire:', existingContact.id)
        }
      } else {
        console.warn('[register-company] architectAgencyId introuvable — annuaire non mis à jour')
      }
    } catch (err) {
      // Non bloquant — l'inscription est validée même si l'ajout à l'annuaire échoue
      console.error('[register-company] Erreur ajout annuaire:', err)
    }

    return NextResponse.json({ success: true, email, aoId: tokenPayload.aoId }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/auth/register-company]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
