import React from 'react'
import { Document, Page, Text, View, StyleSheet, renderToFile } from '@react-pdf/renderer'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Styles ─────────────────────────────────────────────────────────────────

const GREEN = '#1A5C3A'
const GREEN_LIGHT = '#EAF3ED'
const AMBER = '#B45309'
const RED = '#9B1C1C'
const TEXT = '#1A1A18'
const TEXT2 = '#6B6B65'
const TEXT3 = '#9B9B94'
const BORDER = '#E8E8E3'
const SURFACE2 = '#F3F3F0'
const BLUE = '#1E40AF'
const PURPLE = '#6B21A8'

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 8.5, fontFamily: 'Helvetica', backgroundColor: '#FFFFFF', color: TEXT },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: GREEN },
  headerLeft: {},
  brand: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: GREEN, letterSpacing: 0.5 },
  docTitle: { fontSize: 10, color: TEXT2, marginTop: 3 },
  headerMeta: { fontSize: 7.5, color: TEXT3, textAlign: 'right' },

  // Section
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: GREEN },
  sectionNum: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', backgroundColor: GREEN, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, marginRight: 6 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: GREEN },

  // Sub-section
  subSection: { marginBottom: 10, marginLeft: 0 },
  subTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: TEXT, marginBottom: 5, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: GREEN },

  // Grid
  grid2: { flexDirection: 'row', gap: 8 },
  col: { flex: 1 },

  // Cards
  card: { backgroundColor: SURFACE2, borderRadius: 5, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: BORDER },
  cardTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: TEXT, marginBottom: 4 },
  cardBody: { fontSize: 7.5, color: TEXT2, lineHeight: 1.5 },

  // Pill badges
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, fontSize: 7, fontFamily: 'Helvetica-Bold' },
  badgeGreen: { backgroundColor: GREEN_LIGHT, color: GREEN },
  badgeAmber: { backgroundColor: '#FEF3E2', color: AMBER },
  badgeBlue: { backgroundColor: '#DBEAFE', color: BLUE },
  badgeRed: { backgroundColor: '#FEE8E8', color: RED },
  badgePurple: { backgroundColor: '#F3E8FF', color: PURPLE },
  badgeGray: { backgroundColor: SURFACE2, color: TEXT2 },

  // Table
  table: { marginBottom: 8 },
  tableHeader: { flexDirection: 'row', backgroundColor: GREEN, padding: 5 },
  tableHeaderCell: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' },
  tableRow: { flexDirection: 'row', padding: 5, borderBottomWidth: 1, borderBottomColor: BORDER },
  tableRowAlt: { flexDirection: 'row', padding: 5, borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: '#FAFAF8' },
  tableCell: { fontSize: 7.5, color: TEXT },
  tableCellMuted: { fontSize: 7.5, color: TEXT2 },

  // Flow / diagram
  flowRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  flowBox: { borderWidth: 1, borderColor: GREEN, borderRadius: 4, padding: '4 8', backgroundColor: GREEN_LIGHT },
  flowBoxText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: GREEN },
  flowArrow: { fontSize: 10, color: TEXT3, marginHorizontal: 6 },
  flowArrowDown: { fontSize: 10, color: TEXT3, marginVertical: 2, marginLeft: 30 },

  // Role boxes
  roleBox: { borderRadius: 4, padding: '4 8', marginRight: 4 },

  // Bullet list
  bullet: { flexDirection: 'row', marginBottom: 3 },
  bulletDot: { fontSize: 8.5, color: GREEN, marginRight: 5, marginTop: 0.5 },
  bulletText: { fontSize: 7.5, color: TEXT2, flex: 1, lineHeight: 1.5 },

  // Code-like
  mono: { fontFamily: 'Courier', fontSize: 7, color: '#374151', backgroundColor: '#F3F4F6', padding: '2 4', borderRadius: 2 },

  // Divider
  divider: { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 10 },

  // Footer
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 6 },
  footerText: { fontSize: 7, color: TEXT3 },
})

// ── Helpers ────────────────────────────────────────────────────────────────

function Badge({ label, type = 'green' }: { label: string; type?: 'green' | 'amber' | 'blue' | 'red' | 'purple' | 'gray' }) {
  const styleMap = { green: s.badgeGreen, amber: s.badgeAmber, blue: s.badgeBlue, red: s.badgeRed, purple: s.badgePurple, gray: s.badgeGray }
  return <Text style={[s.badge, styleMap[type]]}>{label}</Text>
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={s.bullet}>
      <Text style={s.bulletDot}>•</Text>
      <Text style={s.bulletText}>{text}</Text>
    </View>
  )
}

function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionNum}>{num}</Text>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  )
}

function Footer({ page }: { page: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>ArchFlow — Document d'architecture technique</Text>
      <Text style={s.footerText}>{page}</Text>
    </View>
  )
}

// ── Document ───────────────────────────────────────────────────────────────

function ArchitectureDoc() {
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Document title="ArchFlow — Architecture Technique" author="ArchFlow">

      {/* ═══ PAGE 1 — Couverture + Vision ═══ */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.brand}>ArchFlow</Text>
            <Text style={s.docTitle}>Architecture Technique — Vue d'ensemble</Text>
          </View>
          <View>
            <Text style={s.headerMeta}>Généré le {date}</Text>
            <Text style={s.headerMeta}>Version sprint S14</Text>
          </View>
        </View>

        {/* Vision */}
        <View style={s.section}>
          <SectionHeader num="01" title="Vision produit" />
          <View style={s.grid2}>
            <View style={[s.card, s.col]}>
              <Text style={s.cardTitle}>Problème résolu</Text>
              <Text style={s.cardBody}>
                Les architectes gèrent leurs DPGF sous Excel, envoient les plans par email et comparent les offres manuellement.
                ArchFlow centralise tout : consultation des entreprises, analyse des offres, suivi de chantier.
              </Text>
            </View>
            <View style={[s.card, s.col]}>
              <Text style={s.cardTitle}>Positionnement</Text>
              <Text style={s.cardBody}>
                SaaS B2B pour cabinets d'architecture d'intérieur (1–10 personnes, France).
                Concurrent de Mesetys.tech — spécialisé consultation DPGF là où Mesetys se concentre sur la collaboration client.
              </Text>
            </View>
          </View>
        </View>

        {/* Stack */}
        <View style={s.section}>
          <SectionHeader num="02" title="Stack technique" />
          <View style={s.grid2}>
            <View style={s.col}>
              <View style={s.subSection}>
                <Text style={s.subTitle}>Frontend & Framework</Text>
                <View style={s.badgeRow}>
                  <Badge label="Next.js 14 App Router" type="blue" />
                  <Badge label="TypeScript 5.x" type="blue" />
                  <Badge label="Tailwind CSS 3.x" type="blue" />
                  <Badge label="shadcn/ui + Radix UI" type="gray" />
                  <Badge label="TanStack Table" type="gray" />
                  <Badge label="Recharts" type="gray" />
                  <Badge label="React-PDF" type="gray" />
                </View>
              </View>
              <View style={s.subSection}>
                <Text style={s.subTitle}>Backend & Data</Text>
                <View style={s.badgeRow}>
                  <Badge label="PostgreSQL (Supabase)" type="green" />
                  <Badge label="Prisma ORM 5.x" type="green" />
                  <Badge label="Supabase Auth" type="green" />
                  <Badge label="Supabase Storage" type="green" />
                  <Badge label="Zod validation" type="gray" />
                </View>
              </View>
            </View>
            <View style={s.col}>
              <View style={s.subSection}>
                <Text style={s.subTitle}>Services externes</Text>
                <View style={s.badgeRow}>
                  <Badge label="Resend (emails)" type="amber" />
                  <Badge label="Stripe (paiements)" type="amber" />
                  <Badge label="Anthropic Claude (IA)" type="purple" />
                  <Badge label="Upstash QStash (jobs)" type="amber" />
                  <Badge label="Vercel (déploiement)" type="blue" />
                  <Badge label="annuaire-entreprises.data.gouv.fr" type="gray" />
                </View>
              </View>
              <View style={s.subSection}>
                <Text style={s.subTitle}>Tooling</Text>
                <View style={s.badgeRow}>
                  <Badge label="React Email" type="gray" />
                  <Badge label="jose (JWT)" type="gray" />
                  <Badge label="Upstash QStash" type="gray" />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Roles */}
        <View style={s.section}>
          <SectionHeader num="03" title="Rôles utilisateurs" />
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, { flex: 1.2 }]}>Rôle</Text>
              <Text style={[s.tableHeaderCell, { flex: 2 }]}>Description</Text>
              <Text style={[s.tableHeaderCell, { flex: 2 }]}>Accès</Text>
              <Text style={[s.tableHeaderCell, { flex: 1 }]}>ID Prisma</Text>
            </View>
            {[
              ['ARCHITECT', 'Utilisateur principal — cabinet archi', '/dashboard, /dpgf/*, /settings, /annuaire', 'UUID Supabase'],
              ['COLLABORATOR', 'Membre de l\'équipe — droits limités par projet', '/dashboard, /dpgf/* (selon permissions)', 'UUID Supabase'],
              ['COMPANY', 'Entreprise invitée — portail dédié', '/portal/[aoId]/* seulement', 'CUID (≠ Supabase)'],
              ['CLIENT', 'Client du projet — espace lecture', '/client/[projectId] seulement', 'UUID Supabase'],
              ['ADMIN', 'Super-admin ArchFlow — back-office', '/admin/*, tous les endpoints', 'UUID Supabase'],
            ].map(([role, desc, access, id], i) => (
              <View key={role} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={[s.tableCell, { flex: 1.2, fontFamily: 'Helvetica-Bold', color: role === 'ARCHITECT' ? BLUE : role === 'COMPANY' ? AMBER : role === 'ADMIN' ? RED : role === 'COLLABORATOR' ? PURPLE : GREEN }]}>{role}</Text>
                <Text style={[s.tableCellMuted, { flex: 2 }]}>{desc}</Text>
                <Text style={[s.tableCellMuted, { flex: 2 }]}>{access}</Text>
                <Text style={[s.tableCellMuted, { flex: 1, fontFamily: 'Courier', fontSize: 7 }]}>{id}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Modules */}
        <View style={s.section}>
          <SectionHeader num="04" title="Architecture Shell modulaire" />
          <Text style={[s.cardBody, { marginBottom: 8 }]}>
            La plateforme est un <Text style={{ fontFamily: 'Helvetica-Bold' }}>shell modulaire</Text> : une coque centrale d'auth/navigation + des modules métier indépendants. Les modules ne se parlent jamais directement — toute communication passe par les tables partagées (projects, users, agencies).
          </Text>
          <View style={s.grid2}>
            {[
              { name: 'Shell', badge: 'CORE', color: 'green' as const, items: ['Auth & sessions', 'Dashboard projets', 'Paramètres agence', 'Notifications', 'Annuaire contacts', 'Facturation Stripe'] },
              { name: 'Module 01 — DPGF', badge: 'ACTIF', color: 'blue' as const, items: ['Éditeur DPGF inline', 'Bibliothèque intitulés', 'Import IA (PDF/Excel)', 'Appel d\'offre + invitations', 'DCE documents', 'Q&A + Analyse offres'] },
              { name: 'Module 02 — Chantier', badge: 'FUTUR', color: 'gray' as const, items: ['Suivi de chantier', 'Planification', 'Comptes-rendus'] },
              { name: 'Module 03 — Facturation', badge: 'FUTUR', color: 'gray' as const, items: ['Génération factures', 'Suivi paiements', 'Intégration comptable'] },
            ].map((mod) => (
              <View key={mod.name} style={[s.card, { marginBottom: 6 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={s.cardTitle}>{mod.name}</Text>
                  <Badge label={mod.badge} type={mod.color} />
                </View>
                {mod.items.map((item) => <Bullet key={item} text={item} />)}
              </View>
            ))}
          </View>
        </View>

        <Footer page="1 / 4" />
      </Page>

      {/* ═══ PAGE 2 — Routes & API ═══ */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View><Text style={s.brand}>ArchFlow</Text><Text style={s.docTitle}>Routes & API</Text></View>
          <Text style={s.headerMeta}>{date}</Text>
        </View>

        {/* Pages */}
        <View style={s.section}>
          <SectionHeader num="05" title="Routes pages (Next.js App Router)" />
          <View style={s.grid2}>
            <View style={s.col}>
              <View style={s.subSection}>
                <Text style={s.subTitle}>Authentification (public)</Text>
                {['/login', '/forgot-password', '/register', '/register/company', '/register/invite'].map(r => (
                  <View key={r} style={[s.bullet, { marginBottom: 2 }]}>
                    <Text style={[s.mono, { marginRight: 4 }]}>{r}</Text>
                  </View>
                ))}
              </View>
              <View style={s.subSection}>
                <Text style={s.subTitle}>Shell — Architectes</Text>
                {['/dashboard', '/dashboard/new', '/mes-appels-doffres', '/annuaire', '/settings', '/settings/billing'].map(r => (
                  <View key={r} style={[s.bullet, { marginBottom: 2 }]}>
                    <Text style={[s.mono, { marginRight: 4 }]}>{r}</Text>
                  </View>
                ))}
              </View>
              <View style={s.subSection}>
                <Text style={s.subTitle}>Module DPGF</Text>
                {['/dpgf/[projectId]', '/dpgf/[projectId]/dce', '/dpgf/[projectId]/ao', '/dpgf/[projectId]/ao/[aoId]', '/dpgf/[projectId]/qa', '/dpgf/[projectId]/analyse', '/dpgf/[projectId]/import'].map(r => (
                  <View key={r} style={[s.bullet, { marginBottom: 2 }]}>
                    <Text style={[s.mono, { marginRight: 4 }]}>{r}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={s.col}>
              <View style={s.subSection}>
                <Text style={s.subTitle}>Portail Entreprise</Text>
                {['/portal/[aoId]', '/portal/[aoId]/plans', '/portal/[aoId]/documents', '/portal/[aoId]/questions'].map(r => (
                  <View key={r} style={[s.bullet, { marginBottom: 2 }]}>
                    <Text style={[s.mono, { marginRight: 4 }]}>{r}</Text>
                  </View>
                ))}
              </View>
              <View style={s.subSection}>
                <Text style={s.subTitle}>Espace Client</Text>
                {['/client/[projectId]'].map(r => (
                  <View key={r} style={[s.bullet, { marginBottom: 2 }]}>
                    <Text style={[s.mono, { marginRight: 4 }]}>{r}</Text>
                  </View>
                ))}
              </View>
              <View style={s.subSection}>
                <Text style={s.subTitle}>Admin ArchFlow</Text>
                {['/admin', '/admin/users', '/admin/waitlist', '/admin/announcements', '/admin/emails'].map(r => (
                  <View key={r} style={[s.bullet, { marginBottom: 2 }]}>
                    <Text style={[s.mono, { marginRight: 4 }]}>{r}</Text>
                  </View>
                ))}
              </View>
              <View style={s.subSection}>
                <Text style={s.subTitle}>Marketing (public)</Text>
                {['/'].map(r => (
                  <View key={r} style={[s.bullet, { marginBottom: 2 }]}>
                    <Text style={[s.mono, { marginRight: 4 }]}>{r}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* API */}
        <View style={s.section}>
          <SectionHeader num="06" title="API Routes (69 endpoints)" />
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, { flex: 2.5 }]}>Groupe</Text>
              <Text style={[s.tableHeaderCell, { flex: 4.5 }]}>Endpoints clés</Text>
              <Text style={[s.tableHeaderCell, { flex: 1 }]}>Auth</Text>
            </View>
            {[
              ['Auth / Inscription', '/api/auth/register, /api/auth/register-company', 'Public'],
              ['Projects & DPGF', '/api/projects/[id], /api/dpgf/[id], /api/dpgf/[id]/lots, /api/dpgf/[id]/lots/[id]/posts', 'ARCHITECT'],
              ['DCE Documents', '/api/dpgf/[id]/dce, /api/ao/[id]/documents, /api/ao/[id]/documents/[id]/read', 'ARCHITECT'],
              ['Appel d\'Offre', '/api/ao, /api/ao/[id], /api/ao/[id]/status, /api/ao/[id]/invite, /api/ao/[id]/close', 'ARCHITECT'],
              ['Analyse', '/api/ao/[id]/analysis, /api/ao/[id]/report, /api/ao/[id]/scoring-config', 'ARCHITECT'],
              ['Entreprises AO', '/api/ao/[id]/companies, /api/ao/[id]/companies/[id]/admin-docs/[id]', 'ARCHITECT'],
              ['Q&A', '/api/ao/[id]/qa, /api/ao/[id]/qa/[id]/answer', 'ARCHITECT / COMPANY'],
              ['Portail Entreprise', '/api/portal/[aoId], /api/portal/[aoId]/offer, /api/portal/[aoId]/admin-docs', 'JWT token'],
              ['Espace Client', '/api/client/[projectId]/consultation', 'SESSION'],
              ['Bibliothèque', '/api/library, /api/library/[id]', 'ARCHITECT'],
              ['Profil Entreprise', '/api/company/profile, /api/company/aos', 'COMPANY'],
              ['Import IA', '/api/ai-import, /api/ai-import/[id]', 'ARCHITECT'],
              ['Notifications', '/api/notifications, /api/notifications/read-all', 'SESSION'],
              ['Stripe', '/api/stripe/checkout, /api/stripe/portal, /api/webhooks/stripe', 'SESSION / Public'],
              ['Admin', '/api/admin/users/[id], /api/admin/users/[id]/impersonate, /api/admin/emails/send', 'ADMIN'],
              ['Waitlist & Contacts', '/api/waitlist, /api/contacts', 'Mixed'],
              ['Jobs Cron', '/api/jobs/reminders (quotidien 8h UTC)', 'Cron secret'],
            ].map(([group, endpoints, auth], i) => (
              <View key={group} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={[s.tableCell, { flex: 2.5, fontFamily: 'Helvetica-Bold' }]}>{group}</Text>
                <Text style={[s.tableCellMuted, { flex: 4.5, fontFamily: 'Courier', fontSize: 7 }]}>{endpoints}</Text>
                <Text style={[s.tableCellMuted, { flex: 1 }]}>{auth}</Text>
              </View>
            ))}
          </View>
        </View>

        <Footer page="2 / 4" />
      </Page>

      {/* ═══ PAGE 3 — Modèle de données ═══ */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View><Text style={s.brand}>ArchFlow</Text><Text style={s.docTitle}>Modèle de données (27 modèles Prisma)</Text></View>
          <Text style={s.headerMeta}>{date}</Text>
        </View>

        {/* Shell models */}
        <View style={s.section}>
          <SectionHeader num="07" title="Modèles Shell (partagés entre modules)" />
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, { flex: 1.3 }]}>Modèle</Text>
              <Text style={[s.tableHeaderCell, { flex: 3.7 }]}>Champs clés</Text>
              <Text style={[s.tableHeaderCell, { flex: 2 }]}>Relations</Text>
            </View>
            {[
              ['Agency', 'name, plan (SOLO/STUDIO/AGENCY), stripeCustomerId, activeModules[], siret, siretVerified, legalForm, companyAddress, city, country, trade, signatoryQuality', 'users, projects, library, contacts'],
              ['User', 'email(unique), role, agencyId, firstName, lastName, suspended, freeAccess, aiImportLimit, lastSeenAt', 'agency, permissions, notifications, activityLogs'],
              ['Project', 'agencyId, name, address, projectType, surface, budget, vatRate(20%), status, clientContactId', 'agency, dpgfs, permissions, clientContact'],
              ['Contact', 'agencyId, type(CLIENT/ENTREPRISE), firstName, lastName, email, company, phone, notes', 'agency, projects'],
              ['ProjectPermission', 'projectId, userId, module, permissions(JSON)', 'project, user'],
              ['Notification', 'userId, type, title, body, link, readAt', 'user'],
              ['Announcement', 'message, type(INFO/SUCCESS/WARNING), startDate, endDate, isActive, link', '—'],
              ['WaitlistEntry', 'firstName, lastName, email(unique), cabinetName, city, status, inviteToken', '—'],
            ].map(([model, fields, relations], i) => (
              <View key={model} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={[s.tableCell, { flex: 1.3, fontFamily: 'Helvetica-Bold', color: GREEN }]}>{model}</Text>
                <Text style={[s.tableCellMuted, { flex: 3.7, fontFamily: 'Courier', fontSize: 7 }]}>{fields}</Text>
                <Text style={[s.tableCellMuted, { flex: 2 }]}>{relations}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* DPGF models */}
        <View style={s.section}>
          <SectionHeader num="08" title="Modèles Module DPGF" />
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, { flex: 1.5 }]}>Modèle</Text>
              <Text style={[s.tableHeaderCell, { flex: 3.5 }]}>Champs clés</Text>
              <Text style={[s.tableHeaderCell, { flex: 2 }]}>Relations</Text>
            </View>
            {[
              ['DPGF', 'projectId, status(DRAFT/AO_SENT/CLOSED/ARCHIVED), currentVersionId, createdById', 'lots, versions, aos, documents, aiImports'],
              ['DPGFVersion', 'dpgfId, name, snapshotJson(JSON), createdById', 'dpgf'],
              ['Lot', 'dpgfId, number, name, position', 'dpgf, sublots, posts'],
              ['SubLot', 'lotId, number, name, position', 'lot, posts'],
              ['Post', 'lotId, sublotId, ref(ex: "01.02.03"), title, unit, qtyArchi, unitPriceArchi, isOptional, commentArchi, position', 'lot, sublot, offerPosts'],
              ['Library', 'agencyId, title, unit, avgPrice, minPrice, maxPrice, trade, usageCount', 'agency'],
              ['AO', 'dpgfId, name, lotIds[], deadline, status(DRAFT→AWARDED), allowCustomQty, isPaid, requiredDocs(JSON), snapshotJson, sentAt', 'dpgf, aoCompanies, documents, qas, scoringConfig'],
              ['AOScoringConfig', 'aoId(unique), weightPrice(30%), weightDocuments(25%), weightReliability(20%), weightDivergences(15%), weightReactivity(10%)', 'ao'],
              ['AOCompany', 'aoId, companyUserId, inviteToken(unique), tokenUsedAt, status(INVITED→SUBMITTED), paymentStatus', 'ao, offer, adminDocs, documentReads, qas'],
              ['Offer', 'aoId, aoCompanyId(unique), submittedAt, isComplete, vatRate(20%)', 'aoCompany, offerPosts'],
              ['OfferPost', 'offerId, postId, qtyCompany, qtyMotive, unitPrice, comment, isVariant, variantDescription', 'offer, post'],
              ['Document', 'dpgfId, aoId, name, category, fileUrl, isMandatory, revision, uploadedById', 'dpgf, ao, reads'],
              ['DocumentRead', 'documentId, aoCompanyId, readAt — unique(documentId, aoCompanyId)', 'document, aoCompany'],
              ['AdminDoc', 'aoCompanyId, type(kbis/decennale/rcpro/rib/urssaf), fileUrl, status, rejectionReason, expiresAt', 'aoCompany'],
              ['QA', 'aoId, aoCompanyId, title, body, attachmentUrl, postRef, visibility(PUBLIC/PRIVATE), status', 'ao, aoCompany, answer'],
              ['QAAnswer', 'qaId(unique), answeredById, body, createdAt', 'qa'],
              ['AIImport', 'dpgfId, originalFilename, fileType, aiModel, rawResponse(JSON), status(PROCESSING/REVIEW/IMPORTED/FAILED)', 'dpgf'],
            ].map(([model, fields, relations], i) => (
              <View key={model} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={[s.tableCell, { flex: 1.5, fontFamily: 'Helvetica-Bold', color: BLUE }]}>{model}</Text>
                <Text style={[s.tableCellMuted, { flex: 3.5, fontFamily: 'Courier', fontSize: 7 }]}>{fields}</Text>
                <Text style={[s.tableCellMuted, { flex: 2 }]}>{relations}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Enums */}
        <View style={s.section}>
          <SectionHeader num="09" title="Enums (13)" />
          <View style={s.grid2}>
            <View style={s.col}>
              {[
                ['AOStatus', 'DRAFT → SENT → IN_PROGRESS → CLOSED → ANALYSED → AWARDED → ARCHIVED'],
                ['AOCompanyStatus', 'INVITED → OPENED → IN_PROGRESS → SUBMITTED / INCOMPLETE'],
                ['DPGFStatus', 'DRAFT → AO_SENT → CLOSED → ARCHIVED'],
                ['AdminDocStatus', 'PENDING → VALID / EXPIRED / REJECTED'],
                ['AIImportStatus', 'PROCESSING → REVIEW → IMPORTED / FAILED'],
                ['Role', 'ARCHITECT, COLLABORATOR, CLIENT, COMPANY, ADMIN'],
              ].map(([name, values]) => (
                <View key={name} style={s.bullet}>
                  <Text style={[s.bulletDot, { fontFamily: 'Helvetica-Bold', color: BLUE }]}>{name}</Text>
                  <Text style={[s.bulletText, { fontFamily: 'Courier', fontSize: 7 }]}>{values}</Text>
                </View>
              ))}
            </View>
            <View style={s.col}>
              {[
                ['Plan', 'SOLO, STUDIO, AGENCY'],
                ['ProjectStatus', 'ACTIVE, ARCHIVED'],
                ['QAVisibility', 'PUBLIC, PRIVATE'],
                ['QAStatus', 'PENDING, ANSWERED'],
                ['WaitlistStatus', 'PENDING, APPROVED, REJECTED'],
                ['AnnouncementType', 'INFO, SUCCESS, WARNING'],
                ['ContactType', 'CLIENT, ENTREPRISE'],
              ].map(([name, values]) => (
                <View key={name} style={s.bullet}>
                  <Text style={[s.bulletDot, { fontFamily: 'Helvetica-Bold', color: BLUE }]}>{name}</Text>
                  <Text style={[s.bulletText, { fontFamily: 'Courier', fontSize: 7 }]}>{values}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <Footer page="3 / 4" />
      </Page>

      {/* ═══ PAGE 4 — Auth, Flux, Points critiques ═══ */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View><Text style={s.brand}>ArchFlow</Text><Text style={s.docTitle}>Authentification, Flux métier & Points critiques</Text></View>
          <Text style={s.headerMeta}>{date}</Text>
        </View>

        {/* Auth */}
        <View style={s.section}>
          <SectionHeader num="10" title="Système d'authentification" />
          <View style={s.grid2}>
            <View style={s.col}>
              <View style={s.card}>
                <Text style={s.cardTitle}>Supabase Auth (JWT)</Text>
                <Bullet text="Login standard via email + mot de passe" />
                <Bullet text="Session stockée dans cookies httpOnly" />
                <Bullet text="Vérifiée côté serveur via createServerClient()" />
                <Bullet text="Magic link pour impersonation admin" />
              </View>
              <View style={s.card}>
                <Text style={s.cardTitle}>Middleware Next.js</Text>
                <Bullet text="Protège toutes les routes /dashboard, /dpgf, /settings, /admin" />
                <Bullet text="Portail : accepte JWT token param OU session" />
                <Bullet text="Routes publiques : /, /login, /register, /api/webhooks" />
              </View>
            </View>
            <View style={s.col}>
              <View style={s.card}>
                <Text style={s.cardTitle}>JWT Invitation (jose — HS256)</Text>
                <Bullet text="Payload : { email, aoId, aoCompanyId }" />
                <Bullet text="Expire : deadline AO + 48h" />
                <Bullet text="Token à usage unique — tokenUsedAt marqué après inscription" />
                <Bullet text="Stocké sur AOCompany.inviteToken (unique)" />
              </View>
              <View style={s.card}>
                <Text style={s.cardTitle}>Helpers auth (src/lib/auth.ts)</Text>
                <Bullet text="getSession() — récupère la session Supabase serveur" />
                <Bullet text="requireRole(roles) — vérifie le rôle + suspension" />
                <Bullet text="getUserWithProfile() — upsert profil au 1er login" />
                <Bullet text="requireAdmin() — vérifie ADMIN_EMAILS env var" />
              </View>
            </View>
          </View>
        </View>

        {/* Invitation flow */}
        <View style={s.section}>
          <SectionHeader num="11" title="Flux d'invitation entreprise" />
          <View style={s.card}>
            <Text style={[s.cardTitle, { marginBottom: 8 }]}>inviteCompany() — src/lib/invite.ts</Text>
            <View style={s.flowRow}>
              <View style={s.flowBox}><Text style={s.flowBoxText}>Architecte invite email</Text></View>
              <Text style={s.flowArrow}>→</Text>
              <View style={[s.flowBox, { borderColor: AMBER, backgroundColor: '#FEF3E2' }]}><Text style={[s.flowBoxText, { color: AMBER }]}>Email existe en DB ?</Text></View>
            </View>
            <View style={[s.grid2, { marginTop: 6, marginLeft: 20 }]}>
              <View style={s.col}>
                <Text style={[s.cardBody, { fontFamily: 'Helvetica-Bold', color: GREEN, marginBottom: 3 }]}>OUI — COMPANY inscrit (agencyId ≠ null)</Text>
                <Bullet text="Crée AOCompany + token portail" />
                <Bullet text="Email 'Nouvel AO' → lien /portal/[aoId]?token=..." />
                <Bullet text="type: EXISTING_COMPANY" />
              </View>
              <View style={s.col}>
                <Text style={[s.cardBody, { fontFamily: 'Helvetica-Bold', color: AMBER, marginBottom: 3 }]}>NON — Nouvel email ou placeholder</Text>
                <Bullet text="Crée User placeholder (role: COMPANY, agencyId: null)" />
                <Bullet text="Crée AOCompany + token inscription" />
                <Bullet text="Email 'Invitation' → lien /register/company?token=..." />
                <Bullet text="type: NEW_COMPANY" />
              </View>
            </View>
            <View style={[s.divider, { marginVertical: 6 }]} />
            <Text style={[s.cardBody, { fontFamily: 'Helvetica-Bold', color: RED }]}>Point critique : redirect() Next.js NE DOIT PAS être dans un try/catch (lève NEXT_REDIRECT — exception spéciale swallowed par catch)</Text>
          </View>
        </View>

        {/* IDs critiques */}
        <View style={s.section}>
          <SectionHeader num="12" title="Points critiques production" />
          <View style={s.grid2}>
            <View style={[s.card, s.col]}>
              <Text style={s.cardTitle}>IDs Prisma vs Supabase Auth</Text>
              <Bullet text="ARCHITECT/COLLABORATOR/ADMIN : Prisma id = UUID Supabase (via getUserWithProfile upsert)" />
              <Bullet text="COMPANY inscrit : Prisma id = CUID ≠ UUID Supabase" />
              <Bullet text="COMPANY placeholder : CUID + PAS de compte Supabase" />
              <Bullet text="→ Pour delete/update Supabase : chercher par email via $queryRaw sur auth.users" />
            </View>
            <View style={[s.card, s.col]}>
              <Text style={s.cardTitle}>Impersonation Admin</Text>
              <Bullet text="generateLink(magiclink) → ouvre nouvel onglet (_blank)" />
              <Bullet text="sessionStorage NOT partagé entre onglets → utiliser localStorage" />
              <Bullet text="localStorage.__adminImpersonating stocke { email, name }" />
              <Bullet text="AdminModeBanner lit localStorage au mount — bannière orange" />
              <Bullet text="Bouton Quitter → signOut() + supprime localStorage" />
            </View>
          </View>
          <View style={s.grid2}>
            <View style={[s.card, s.col]}>
              <Text style={s.cardTitle}>Sécurité données — règles absolues</Text>
              <Bullet text="JAMAIS retourner unitPriceArchi ou totalEstimate à un COMPANY" />
              <Bullet text="JAMAIS retourner les offres des autres entreprises à un COMPANY" />
              <Bullet text="Toujours valider agencyId pour éviter fuites cross-agence" />
              <Bullet text="SUPABASE_SERVICE_ROLE_KEY uniquement côté serveur" />
              <Bullet text="SQL brut interdit (sauf $queryRaw sur auth.* de Supabase)" />
            </View>
            <View style={[s.card, s.col]}>
              <Text style={s.cardTitle}>Déploiement (Vercel)</Text>
              <Bullet text="Build : prisma generate && prisma migrate deploy && next build" />
              <Bullet text="Cron : /api/jobs/reminders — 0 8 * * * (QStash)" />
              <Bullet text="Prisma CLI : ne lit pas .env.local — exporter les vars" />
              <Bullet text="Migrations : toujours prisma migrate dev, jamais db push" />
              <Bullet text="Branch main = production automatique" />
            </View>
          </View>
        </View>

        {/* Lib files */}
        <View style={s.section}>
          <SectionHeader num="13" title="Librairies métier (src/lib/)" />
          <View style={s.grid2}>
            <View style={s.col}>
              {[
                ['prisma.ts', 'Singleton client Prisma'],
                ['auth.ts', 'getSession, requireRole, getUserWithProfile'],
                ['admin-auth.ts', 'requireAdmin (ADMIN_EMAILS)'],
                ['portal-auth.ts', 'requirePortalAuth (JWT ou session)'],
                ['invite.ts', 'generateInviteToken, verifyInviteToken, inviteCompany'],
                ['email.ts', 'Wrapper Resend — sendEmail()'],
                ['scoring.ts', 'Calcul scores multicritères offres'],
              ].map(([file, desc]) => (
                <View key={file} style={s.bullet}>
                  <Text style={[s.bulletDot, { fontFamily: 'Courier', fontSize: 7.5, color: BLUE }]}>{file}</Text>
                  <Text style={s.bulletText}>{desc}</Text>
                </View>
              ))}
            </View>
            <View style={s.col}>
              {[
                ['ai-import.ts', 'Parsing PDF/Excel via Claude claude-sonnet-4-6'],
                ['dpgf-diff.ts', 'Comparaison snapshot vs état actuel DPGF'],
                ['dpgf-permissions.ts', 'Vérification droits par projet'],
                ['generate-report.tsx', 'Génération PDF rapport analyse (@react-pdf)'],
                ['supabase.ts', 'createBrowserClient() — sans next/headers'],
                ['supabase-server.ts', 'createServerClient() — avec next/headers'],
                ['validations/', 'Schémas Zod : ao, dpgf, library, offer'],
              ].map(([file, desc]) => (
                <View key={file} style={s.bullet}>
                  <Text style={[s.bulletDot, { fontFamily: 'Courier', fontSize: 7.5, color: BLUE }]}>{file}</Text>
                  <Text style={s.bulletText}>{desc}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <Footer page="4 / 4" />
      </Page>
    </Document>
  )
}

// ── Export ─────────────────────────────────────────────────────────────────

const outputPath = path.join(__dirname, '..', 'archflow-architecture.pdf')

renderToFile(<ArchitectureDoc />, outputPath)
  .then(() => console.log(`✅ PDF généré : ${outputPath}`))
  .catch((err: unknown) => { console.error('❌ Erreur:', err); process.exit(1) })
