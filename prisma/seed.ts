import { config } from 'dotenv'
import { resolve } from 'path'

// Charger .env.local avant tout
config({ path: resolve(process.cwd(), '.env.local') })

import { PrismaClient, Role } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function createSupabaseUser(email: string, password: string) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error && error.message !== 'A user with this email address has already been registered') {
    throw new Error(`Erreur création compte Supabase pour ${email}: ${error.message}`)
  }
  return data.user
}

async function main() {
  console.log('🌱 Démarrage du seed...')

  // ── 0. Compte admin ──────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAILS?.split(',')[0]?.trim()
  if (adminEmail) {
    await createSupabaseUser(adminEmail, 'Admin1234!')
    const adminAgency = await prisma.agency.upsert({
      where: { id: 'seed-admin-agency' },
      update: {},
      create: {
        id: 'seed-admin-agency',
        name: 'ArchFlow Admin',
        plan: 'AGENCY',
        activeModules: ['dpgf'],
      },
    })
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        agencyId: adminAgency.id,
        email: adminEmail,
        role: 'ARCHITECT',
        firstName: 'Admin',
      },
    })
    console.log(`✅ Admin créé : ${adminEmail} / Admin1234!`)
  }

  // ── 1. Agence ───────────────────────────────────────────
  const agency = await prisma.agency.upsert({
    where: { id: 'seed-agency-001' },
    update: {},
    create: {
      id: 'seed-agency-001',
      name: 'Cabinet Durand Architecture',
      plan: 'SOLO',
      activeModules: ['dpgf'],
    },
  })
  console.log('✅ Agence créée:', agency.name)

  // ── 2. Architecte (Supabase Auth + Prisma) ──────────────
  await createSupabaseUser('jean@durand-archi.fr', 'Test1234!')
  const architect = await prisma.user.upsert({
    where: { email: 'jean@durand-archi.fr' },
    update: {},
    create: {
      agencyId: agency.id,
      email: 'jean@durand-archi.fr',
      role: 'ARCHITECT' as Role,
      firstName: 'Jean',
      lastName: 'Durand',
    },
  })
  console.log('✅ Architecte créé:', architect.email)

  // ── 3. Entreprises (Supabase Auth + Prisma) ─────────────
  const companies = [
    { email: 'entreprise-a@test.fr', firstName: 'Sophie', lastName: 'Martin', password: 'Test1234!' },
    { email: 'entreprise-b@test.fr', firstName: 'Marc', lastName: 'Leblanc', password: 'Test1234!' },
    { email: 'entreprise-c@test.fr', firstName: 'Isabelle', lastName: 'Garnier', password: 'Test1234!' },
  ]

  for (const company of companies) {
    await createSupabaseUser(company.email, company.password)
    await prisma.user.upsert({
      where: { email: company.email },
      update: {},
      create: {
        email: company.email,
        role: 'COMPANY' as Role,
        firstName: company.firstName,
        lastName: company.lastName,
      },
    })
    console.log('✅ Entreprise créée:', company.email)
  }

  // ── 4. Projet ────────────────────────────────────────────
  const project = await prisma.project.upsert({
    where: { id: 'seed-project-001' },
    update: {},
    create: {
      id: 'seed-project-001',
      agencyId: agency.id,
      name: 'Villa Martignon — Paris 16e',
      address: '12 avenue Foch, 75016 Paris',
      status: 'ACTIVE',
    },
  })
  console.log('✅ Projet créé:', project.name)

  // ── 5. DPGF ──────────────────────────────────────────────
  const dpgf = await prisma.dPGF.upsert({
    where: { id: 'seed-dpgf-001' },
    update: {},
    create: {
      id: 'seed-dpgf-001',
      projectId: project.id,
      status: 'DRAFT',
      createdById: architect.id,
    },
  })
  console.log('✅ DPGF créée')

  // ── 6. Lots et postes ────────────────────────────────────

  // Lot 01 — Démolition / Gros œuvre
  const lot1 = await prisma.lot.upsert({
    where: { id: 'seed-lot-001' },
    update: {},
    create: {
      id: 'seed-lot-001',
      dpgfId: dpgf.id,
      number: 1,
      name: 'Démolition / Gros œuvre',
      position: 1,
    },
  })

  const postsLot1 = [
    {
      id: 'seed-post-001',
      ref: '01.01',
      title: 'Démolition de cloisons en plâtre existantes',
      unit: 'm²',
      qtyArchi: 45,
      unitPriceArchi: 28,
      position: 1,
    },
    {
      id: 'seed-post-002',
      ref: '01.02',
      title: 'Dépose de revêtements de sol (carrelage + colle)',
      unit: 'm²',
      qtyArchi: 120,
      unitPriceArchi: 18,
      position: 2,
    },
    {
      id: 'seed-post-003',
      ref: '01.03',
      title: 'Ouverture de trémie dans dalle béton (y compris renfort IPN)',
      unit: 'u',
      qtyArchi: 1,
      unitPriceArchi: 3200,
      isOptional: true,
      position: 3,
    },
  ]

  for (const post of postsLot1) {
    await prisma.post.upsert({
      where: { id: post.id },
      update: {},
      create: { ...post, lotId: lot1.id },
    })
  }
  console.log('✅ Lot 01 — Démolition créé (3 postes)')

  // Lot 02 — Plâtrerie / Cloisons
  const lot2 = await prisma.lot.upsert({
    where: { id: 'seed-lot-002' },
    update: {},
    create: {
      id: 'seed-lot-002',
      dpgfId: dpgf.id,
      number: 2,
      name: 'Plâtrerie / Cloisons',
      position: 2,
    },
  })

  const postsLot2 = [
    {
      id: 'seed-post-004',
      ref: '02.01',
      title: 'Cloison distributive en double plaque de plâtre BA13 sur ossature métallique',
      unit: 'm²',
      qtyArchi: 85,
      unitPriceArchi: 65,
      position: 1,
    },
    {
      id: 'seed-post-005',
      ref: '02.02',
      title: 'Doublage isolant sur murs périphériques (laine de verre + BA13)',
      unit: 'm²',
      qtyArchi: 60,
      unitPriceArchi: 55,
      position: 2,
    },
  ]

  for (const post of postsLot2) {
    await prisma.post.upsert({
      where: { id: post.id },
      update: {},
      create: { ...post, lotId: lot2.id },
    })
  }
  console.log('✅ Lot 02 — Plâtrerie créé (2 postes)')

  // ── 7. Bibliothèque d'intitulés ──────────────────────────
  const libraryEntries = [
    { title: 'Cloison plâtre BA13 sur ossature métallique', unit: 'm²', avgPrice: 65, trade: 'Plâtrerie' },
    { title: 'Enduit de lissage sur murs', unit: 'm²', avgPrice: 22, trade: 'Plâtrerie' },
    { title: 'Carrelage grès cérame 60x60 posé collé', unit: 'm²', avgPrice: 95, trade: 'Revêtements' },
    { title: 'Parquet massif chêne 14mm posé collé', unit: 'm²', avgPrice: 120, trade: 'Revêtements' },
    { title: 'Peinture acrylique 2 couches sur murs', unit: 'm²', avgPrice: 18, trade: 'Peinture' },
    { title: 'Peinture plafonds — 2 couches', unit: 'm²', avgPrice: 20, trade: 'Peinture' },
    { title: 'Tableau électrique (pose + raccordement)', unit: 'u', avgPrice: 1800, trade: 'Électricité' },
    { title: 'Prise électrique 2P+T encastrée', unit: 'u', avgPrice: 85, trade: 'Électricité' },
    { title: 'Robinetterie lavabo mitigeur thermostatique', unit: 'u', avgPrice: 350, trade: 'Plomberie' },
    { title: 'Porte intérieure bois laquée blanc (pose incluse)', unit: 'u', avgPrice: 680, trade: 'Menuiserie' },
  ]

  for (let i = 0; i < libraryEntries.length; i++) {
    const entry = libraryEntries[i]
    await prisma.library.upsert({
      where: { id: `seed-lib-${String(i + 1).padStart(3, '0')}` },
      update: {},
      create: {
        id: `seed-lib-${String(i + 1).padStart(3, '0')}`,
        agencyId: agency.id,
        ...entry,
      },
    })
  }
  console.log('✅ Bibliothèque créée (10 entrées)')

  // ── 8. Compte mehdi (architecte prod) ──────────────────
  await createSupabaseUser('mehdi.daoudi.nejm@gmail.com', 'Test1234!')
  await prisma.user.upsert({
    where: { email: 'mehdi.daoudi.nejm@gmail.com' },
    update: { role: 'ARCHITECT', firstName: 'Mehdi', lastName: 'Daoudi' },
    create: {
      agencyId: agency.id,
      email: 'mehdi.daoudi.nejm@gmail.com',
      role: 'ARCHITECT',
      firstName: 'Mehdi',
      lastName: 'Daoudi',
    },
  })
  console.log('✅ Architecte prod créé : mehdi.daoudi.nejm@gmail.com')

  console.log('\n🎉 Seed terminé avec succès !')
  console.log('   Compte architecte : jean@durand-archi.fr / Test1234!')
  console.log('   Entreprises : entreprise-a/b/c@test.fr / Test1234!')
  console.log('   Architecte prod : mehdi.daoudi.nejm@gmail.com')
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
