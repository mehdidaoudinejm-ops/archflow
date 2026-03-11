import React from 'react'
import { Document, Page, Text, View, StyleSheet, renderToFile } from '@react-pdf/renderer'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  green:        '#1A5C3A',
  greenMid:     '#2D7A50',
  greenLight:   '#EAF3ED',
  greenBtn:     '#1F6B44',
  amber:        '#B45309',
  amberLight:   '#FEF3E2',
  red:          '#9B1C1C',
  redLight:     '#FEE8E8',
  blue:         '#1E3A8A',
  blueLight:    '#DBEAFE',
  purple:       '#4C1D95',
  purpleLight:  '#EDE9FE',
  text:         '#1A1A18',
  text2:        '#6B6B65',
  text3:        '#9B9B94',
  border:       '#E8E8E3',
  border2:      '#D4D4CC',
  surface:      '#FFFFFF',
  surface2:     '#F8F8F6',
  surface3:     '#F3F3F0',
  dark:         '#111827',
  darkSurface:  '#1F2937',
}

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 8.5, color: C.text, backgroundColor: C.surface, paddingHorizontal: 36, paddingTop: 32, paddingBottom: 44 },

  // Header strip
  headerStrip: { backgroundColor: C.green, marginHorizontal: -36, marginTop: -32, paddingHorizontal: 36, paddingTop: 28, paddingBottom: 20, marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerStripSmall: { backgroundColor: C.green, marginHorizontal: -36, marginTop: -32, paddingHorizontal: 36, paddingTop: 18, paddingBottom: 14, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', letterSpacing: 1 },
  brandSmall: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' },
  tagline: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  headerRight: { textAlign: 'right' },
  headerLabel: { fontSize: 8, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 },
  pageTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', marginTop: 2 },

  // Section titles
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.green, marginBottom: 10, paddingBottom: 5, borderBottomWidth: 1.5, borderBottomColor: C.green, letterSpacing: 0.3 },
  subTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: C.text, marginBottom: 6 },

  // Grid
  row: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },

  // Cards
  card: { borderRadius: 6, padding: 10, marginBottom: 8, borderWidth: 1 },
  cardWhite: { backgroundColor: C.surface, borderColor: C.border },
  cardGreen: { backgroundColor: C.greenLight, borderColor: C.green },
  cardAmber: { backgroundColor: C.amberLight, borderColor: '#D97706' },
  cardBlue: { backgroundColor: C.blueLight, borderColor: '#3B82F6' },
  cardPurple: { backgroundColor: C.purpleLight, borderColor: '#7C3AED' },
  cardRed: { backgroundColor: C.redLight, borderColor: '#EF4444' },
  cardGray: { backgroundColor: C.surface3, borderColor: C.border },
  cardTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', marginBottom: 5 },
  cardBody: { fontSize: 7.5, color: C.text2, lineHeight: 1.6 },

  // Bullet
  bullet: { flexDirection: 'row', marginBottom: 3.5 },
  dot: { fontSize: 8, color: C.green, marginRight: 5, marginTop: 0.5 },
  dotAmber: { fontSize: 8, color: C.amber, marginRight: 5, marginTop: 0.5 },
  dotRed: { fontSize: 8, color: C.red, marginRight: 5, marginTop: 0.5 },
  dotBlue: { fontSize: 8, color: C.blue, marginRight: 5, marginTop: 0.5 },
  bulletText: { fontSize: 7.5, color: C.text2, flex: 1, lineHeight: 1.55 },
  bulletBold: { fontSize: 7.5, color: C.text, flex: 1, lineHeight: 1.55 },

  // Badge inline
  badge: { fontSize: 7, fontFamily: 'Helvetica-Bold', paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 3 },
  badgeGreen: { backgroundColor: C.greenLight, color: C.green },
  badgeAmber: { backgroundColor: C.amberLight, color: C.amber },
  badgeRed: { backgroundColor: C.redLight, color: C.red },
  badgeBlue: { backgroundColor: C.blueLight, color: C.blue },
  badgeGray: { backgroundColor: C.surface3, color: C.text2 },
  badgeDark: { backgroundColor: C.dark, color: '#FFFFFF' },

  // Flow boxes
  flowBox: { borderRadius: 5, paddingVertical: 6, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  flowArrow: { fontSize: 12, color: C.text3, marginHorizontal: 4, alignSelf: 'center' },
  flowArrowV: { fontSize: 12, color: C.text3, marginVertical: 2, alignSelf: 'center' },
  flowLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  flowSub: { fontSize: 6.5, textAlign: 'center', marginTop: 1 },

  // Stat blocks
  statBox: { borderRadius: 6, padding: 10, alignItems: 'center', justifyContent: 'center', flex: 1, borderWidth: 1 },
  statNum: { fontSize: 22, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  statLabel: { fontSize: 7, textAlign: 'center', lineHeight: 1.4 },

  // Table
  table: { borderWidth: 1, borderColor: C.border, borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  thead: { backgroundColor: C.green, flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8 },
  theadCell: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' },
  trow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: C.border },
  trowAlt: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surface2 },
  tcell: { fontSize: 7.5, color: C.text },
  tcellMuted: { fontSize: 7.5, color: C.text2 },

  // Footer
  footer: { position: 'absolute', bottom: 18, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: C.border },
  footerText: { fontSize: 7, color: C.text3 },

  // Risk flags
  riskHigh: { backgroundColor: C.redLight, borderColor: C.red, borderWidth: 1, borderRadius: 4, padding: 8, marginBottom: 6 },
  riskMed: { backgroundColor: C.amberLight, borderColor: C.amber, borderWidth: 1, borderRadius: 4, padding: 8, marginBottom: 6 },
  riskLow: { backgroundColor: C.blueLight, borderColor: C.blue, borderWidth: 1, borderRadius: 4, padding: 8, marginBottom: 6 },
  riskTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  riskBody: { fontSize: 7.5, lineHeight: 1.5 },

  divider: { borderBottomWidth: 1, borderBottomColor: C.border, marginVertical: 10 },
  section: { marginBottom: 16 },
})

// ── Helpers ────────────────────────────────────────────────────────────────

const Dot = ({ color = 'green' }: { color?: 'green' | 'amber' | 'red' | 'blue' }) => {
  const c = { green: C.green, amber: C.amber, red: C.red, blue: C.blue }[color]
  return <Text style={[s.dot, { color: c }]}>•</Text>
}

const B = ({ text, color = 'green' }: { text: string; color?: 'green' | 'amber' | 'red' | 'blue' }) => (
  <View style={s.bullet}>
    <Dot color={color} />
    <Text style={s.bulletText}>{text}</Text>
  </View>
)

const BB = ({ text, sub }: { text: string; sub?: string }) => (
  <View style={[s.bullet, { marginBottom: 5 }]}>
    <Dot />
    <View style={{ flex: 1 }}>
      <Text style={[s.bulletText, { fontFamily: 'Helvetica-Bold', color: C.text }]}>{text}</Text>
      {sub && <Text style={[s.bulletText, { marginTop: 1 }]}>{sub}</Text>}
    </View>
  </View>
)

const Badge = ({ label, type = 'gray' }: { label: string; type?: 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'dark' }) => {
  const style = { green: s.badgeGreen, amber: s.badgeAmber, red: s.badgeRed, blue: s.badgeBlue, gray: s.badgeGray, dark: s.badgeDark }[type]
  return <Text style={[s.badge, style]}>{label}</Text>
}

const Footer = ({ page, label }: { page: string; label: string }) => (
  <View style={s.footer} fixed>
    <Text style={s.footerText}>ArchFlow — Dossier d'audit SaaS · Confidentiel</Text>
    <Text style={s.footerText}>{label} · {page}</Text>
  </View>
)

const FlowBox = ({ label, sub, color = 'green' }: { label: string; sub?: string; color?: 'green' | 'amber' | 'blue' | 'gray' | 'purple' | 'dark' }) => {
  const styles: Record<string, object> = {
    green:  { backgroundColor: C.greenLight,  borderColor: C.green,   textColor: C.green },
    amber:  { backgroundColor: C.amberLight,  borderColor: C.amber,   textColor: C.amber },
    blue:   { backgroundColor: C.blueLight,   borderColor: C.blue,    textColor: C.blue },
    gray:   { backgroundColor: C.surface3,    borderColor: C.border2, textColor: C.text2 },
    purple: { backgroundColor: C.purpleLight, borderColor: C.purple,  textColor: C.purple },
    dark:   { backgroundColor: C.dark,        borderColor: C.dark,    textColor: '#FFFFFF' },
  }
  const st = styles[color] as { backgroundColor: string; borderColor: string; textColor: string }
  return (
    <View style={[s.flowBox, { backgroundColor: st.backgroundColor, borderColor: st.borderColor }]}>
      <Text style={[s.flowLabel, { color: st.textColor }]}>{label}</Text>
      {sub && <Text style={[s.flowSub, { color: st.textColor, opacity: 0.7 }]}>{sub}</Text>}
    </View>
  )
}

const Arrow = () => <Text style={s.flowArrow}>→</Text>

// ══════════════════════════════════════════════════════════════════════════
// DOCUMENT
// ══════════════════════════════════════════════════════════════════════════

export default function AuditDoc() {
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Document title="ArchFlow — Dossier Audit SaaS" author="ArchFlow">

      {/* ════════ PAGE 1 — Vue d'ensemble & Modèle économique ════════ */}
      <Page size="A4" style={s.page}>
        <View style={s.headerStrip}>
          <View>
            <Text style={s.brand}>ArchFlow</Text>
            <Text style={s.tagline}>Plateforme SaaS de gestion d'appels d'offres pour architectes</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerLabel}>DOSSIER D'AUDIT</Text>
            <Text style={s.pageTitle}>Vue d'ensemble</Text>
            <Text style={[s.headerLabel, { marginTop: 3 }]}>{date}</Text>
          </View>
        </View>

        {/* Pitch */}
        <View style={[s.section]}>
          <Text style={s.sectionTitle}>POSITIONNEMENT</Text>
          <View style={s.row}>
            <View style={[s.card, s.cardGreen, s.col]}>
              <Text style={[s.cardTitle, { color: C.green }]}>Problème adressé</Text>
              <Text style={s.cardBody}>
                Les architectes d'intérieur gèrent leurs DPGF (Devis Prévisionnels de Gestion et de Financement) sous Excel, envoient leurs DCE par email et comparent les offres manuellement. Ce processus est chronophage, opaque et source d'erreurs.
              </Text>
            </View>
            <View style={[s.card, s.cardBlue, s.col]}>
              <Text style={[s.cardTitle, { color: C.blue }]}>Solution</Text>
              <Text style={s.cardBody}>
                Plateforme centralisée : DPGF structuré, envoi des appels d'offres, portail entreprise pour saisie des prix, suivi Q&A, analyse comparative des offres avec scoring multicritères, espace client.
              </Text>
            </View>
            <View style={[s.card, s.cardAmber, s.col]}>
              <Text style={[s.cardTitle, { color: C.amber }]}>Marché cible</Text>
              <Text style={s.cardBody}>
                Cabinets d'architecture d'intérieur · 1 à 10 personnes · France{'\n'}Concurrent principal : Mesetys.tech (axé collaboration client){'\n'}Différenciation : spécialisation DPGF + portail entreprise
              </Text>
            </View>
          </View>
        </View>

        {/* Métriques clés */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>MÉTRIQUES PRODUIT (état actuel)</Text>
          <View style={[s.row, { gap: 8, marginBottom: 10 }]}>
            {[
              { num: '3', label: 'Rôles architecte\nARCHITECT · COLLABORATOR · ADMIN', color: C.green, bg: C.greenLight, border: C.green },
              { num: '2', label: 'Portails dédiés\nEntreprise + Client', color: C.blue, bg: C.blueLight, border: C.blue },
              { num: '10', label: 'Sprints livrés\n(S01 → S14)', color: C.amber, bg: C.amberLight, border: C.amber },
              { num: '69', label: 'Endpoints API\ntotalement couverts', color: C.purple, bg: C.purpleLight, border: C.purple },
              { num: '27', label: 'Modèles Prisma\nbase de données normalisée', color: C.text2, bg: C.surface3, border: C.border2 },
            ].map(m => (
              <View key={m.num} style={[s.statBox, { backgroundColor: m.bg, borderColor: m.border }]}>
                <Text style={[s.statNum, { color: m.color }]}>{m.num}</Text>
                <Text style={[s.statLabel, { color: m.color }]}>{m.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Modèle économique */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>MODÈLE ÉCONOMIQUE</Text>
          <View style={s.row}>
            <View style={[s.col]}>
              <Text style={s.subTitle}>Plans d'abonnement (Stripe)</Text>
              <View style={s.table}>
                <View style={s.thead}>
                  <Text style={[s.theadCell, { flex: 1 }]}>Plan</Text>
                  <Text style={[s.theadCell, { flex: 2 }]}>Cible</Text>
                  <Text style={[s.theadCell, { flex: 2 }]}>Modules inclus</Text>
                </View>
                {[
                  ['SOLO', 'Architecte indépendant', 'DPGF, portail, analyse'],
                  ['STUDIO', 'Cabinet 2-5 pers.', 'SOLO + collaborateurs'],
                  ['AGENCY', 'Grande agence', 'STUDIO + illimité'],
                ].map(([plan, target, modules], i) => (
                  <View key={plan} style={i % 2 === 0 ? s.trow : s.trowAlt}>
                    <Text style={[s.tcell, { flex: 1, fontFamily: 'Helvetica-Bold', color: C.green }]}>{plan}</Text>
                    <Text style={[s.tcellMuted, { flex: 2 }]}>{target}</Text>
                    <Text style={[s.tcellMuted, { flex: 2 }]}>{modules}</Text>
                  </View>
                ))}
              </View>
              <View style={[s.card, s.cardAmber]}>
                <Text style={[s.cardTitle, { color: C.amber }]}>Revenus additionnels</Text>
                <B text="AO payant : les architectes peuvent exiger un paiement des entreprises pour accéder au DCE (Stripe Checkout)" />
                <B text="Import IA : limite par utilisateur avec possibilité de dépassement" />
              </View>
            </View>
            <View style={s.col}>
              <Text style={s.subTitle}>Go-to-market actuel</Text>
              <View style={[s.card, s.cardGray]}>
                <BB text="Liste d'attente" sub="Formulaire /register → approval manuel admin → email d'invitation → inscription" />
                <BB text="Invitation directe" sub="Admin approuve depuis /admin/waitlist → génère token d'invite → email Resend" />
                <BB text="Broadcast emails" sub="Dashboard admin → envoi à segments (ARCHITECT, COMPANY, ALL)" />
                <BB text="Annonces in-app" sub="Banner globale configurable par l'admin (INFO / WARNING / SUCCESS)" />
              </View>
              <View style={[s.card, s.cardRed]}>
                <Text style={[s.cardTitle, { color: C.red }]}>⚠ Points d'attention économiques</Text>
                <B text="Pas de pricing public visible — friction à l'acquisition" color="red" />
                <B text="Pas d'essai gratuit ni freemium — barrière d'entrée élevée" color="red" />
                <B text="Acquisition 100% manuelle (liste d'attente) — pas scalable" color="red" />
              </View>
            </View>
          </View>
        </View>

        {/* Stack résumé */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>STACK TECHNIQUE — RÉSUMÉ</Text>
          <View style={[s.row, { flexWrap: 'wrap', gap: 6 }]}>
            {[
              { label: 'Next.js 14 App Router', type: 'blue' as const },
              { label: 'TypeScript', type: 'blue' as const },
              { label: 'Prisma 5 + PostgreSQL', type: 'green' as const },
              { label: 'Supabase Auth + Storage', type: 'green' as const },
              { label: 'Vercel (déploiement)', type: 'blue' as const },
              { label: 'Stripe', type: 'amber' as const },
              { label: 'Resend (emails)', type: 'amber' as const },
              { label: 'Claude claude-sonnet-4-6 (IA)', type: 'gray' as const },
              { label: 'Upstash QStash (cron)', type: 'gray' as const },
              { label: 'Tailwind + shadcn/ui', type: 'gray' as const },
              { label: 'Zod (validation)', type: 'gray' as const },
              { label: 'React-PDF', type: 'gray' as const },
            ].map(b => <Badge key={b.label} label={b.label} type={b.type} />)}
          </View>
        </View>

        <Footer page="1 / 5" label="Positionnement & Économie" />
      </Page>

      {/* ════════ PAGE 2 — Flux utilisateurs ════════ */}
      <Page size="A4" style={s.page}>
        <View style={s.headerStripSmall}>
          <View>
            <Text style={s.brandSmall}>ArchFlow</Text>
            <Text style={[s.tagline, { fontSize: 8 }]}>Dossier d'audit SaaS</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.pageTitle}>Flux utilisateurs</Text>
          </View>
        </View>

        {/* Flux 1 : Architecte */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>FLUX 1 — ARCHITECTE (utilisateur payant)</Text>
          <View style={[s.card, s.cardGreen, { marginBottom: 6 }]}>
            <Text style={[s.cardTitle, { color: C.green, marginBottom: 8 }]}>Onboarding</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
              <FlowBox label="Liste d'attente" sub="/register" color="gray" />
              <Arrow /><FlowBox label="Validation admin" sub="email Resend" color="amber" />
              <Arrow /><FlowBox label="Inscription" sub="/register/invite" color="green" />
              <Arrow /><FlowBox label="Dashboard" sub="/dashboard" color="green" />
            </View>
          </View>
          <View style={[s.card, s.cardGreen]}>
            <Text style={[s.cardTitle, { color: C.green, marginBottom: 8 }]}>Cycle DPGF → Appel d'offre → Analyse</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
              <FlowBox label="Créer projet" sub="/dashboard/new" color="green" />
              <Arrow /><FlowBox label="Saisir DPGF" sub="éditeur inline" color="green" />
              <Arrow /><FlowBox label="Importer (IA)" sub="PDF / Excel" color="purple" />
              <Arrow /><FlowBox label="Uploader DCE" sub="plans, CCTP…" color="green" />
              <Arrow /><FlowBox label="Créer AO" sub="wizard 4 étapes" color="green" />
              <Arrow /><FlowBox label="Inviter entreprises" sub="email JWT token" color="amber" />
              <Arrow /><FlowBox label="Gérer Q&A" sub="public / privé" color="green" />
              <Arrow /><FlowBox label="Analyser offres" sub="scoring multicritères" color="green" />
              <Arrow /><FlowBox label="Publier client" sub="espace lecture" color="blue" />
            </View>
          </View>
        </View>

        {/* Flux 2 : Entreprise */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>FLUX 2 — ENTREPRISE INVITÉE (accès gratuit, portail JWT)</Text>
          <View style={s.row}>
            <View style={[s.col]}>
              <View style={[s.card, s.cardAmber, { marginBottom: 6 }]}>
                <Text style={[s.cardTitle, { color: C.amber, marginBottom: 8 }]}>Nouvelle entreprise</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <FlowBox label="Email invitation" sub="JWT token" color="amber" />
                  <Arrow /><FlowBox label="Inscription" sub="/register/company" color="amber" />
                  <Arrow /><FlowBox label="Portail AO" sub="/portal/[aoId]" color="green" />
                </View>
              </View>
              <View style={[s.card, s.cardGray]}>
                <Text style={[s.cardTitle, { marginBottom: 8 }]}>Entreprise déjà inscrite</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <FlowBox label="Email 'Nouvel AO'" sub="lien portail direct" color="gray" />
                  <Arrow /><FlowBox label="Portail AO" sub="/portal/[aoId]" color="green" />
                </View>
              </View>
            </View>
            <View style={s.col}>
              <View style={[s.card, s.cardGreen]}>
                <Text style={[s.cardTitle, { color: C.green, marginBottom: 8 }]}>Actions sur le portail</Text>
                <B text="Consulter les lots et postes (sans prix archi)" />
                <B text="Saisir prix unitaires + quantités modifiées" />
                <B text="Poser des questions (Q&A)" />
                <B text="Télécharger et marquer documents lus (DCE)" />
                <B text="Déposer documents administratifs (Kbis, RC Pro…)" />
                <B text="Soumettre l'offre (isComplete = true)" />
                <View style={[s.divider, { marginVertical: 6 }]} />
                <Text style={[s.cardBody, { fontFamily: 'Helvetica-Bold', color: C.red }]}>Données jamais exposées : estimatif archi, offres concurrentes</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Flux 3 : Client */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>FLUX 3 — CLIENT MAÎTRE D'OUVRAGE (lecture seule)</Text>
          <View style={[s.card, s.cardBlue]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <FlowBox label="Invitation client" sub="email" color="blue" />
              <Arrow /><FlowBox label="Compte CLIENT" sub="Supabase Auth" color="blue" />
              <Arrow /><FlowBox label="Espace client" sub="/client/[projectId]" color="blue" />
              <Arrow /><FlowBox label="Éléments publiés" sub="contrôle par architecte" color="blue" />
            </View>
            <B text="L'architecte contrôle exactement ce que voit le client (publishedElements JSON)" color="blue" />
            <B text="Lecture seule — aucune action sur le DPGF ou les offres" color="blue" />
          </View>
        </View>

        {/* Flux 4 : Admin */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>FLUX 4 — ADMIN ARCHFLOW (back-office interne)</Text>
          <View style={[s.card, s.cardGray]}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginBottom: 8 }}>
              <FlowBox label="Dashboard" sub="MRR, signups" color="dark" />
              <Arrow /><FlowBox label="Users" sub="suspend, delete, limites" color="dark" />
              <Arrow /><FlowBox label="Waitlist" sub="approve, reject" color="dark" />
              <Arrow /><FlowBox label="Annonces" sub="in-app banner" color="dark" />
              <Arrow /><FlowBox label="Emails" sub="broadcast segments" color="dark" />
              <Arrow /><FlowBox label="Impersonate" sub="magic link + bannière" color="dark" />
            </View>
            <B text="Accès restreint à ADMIN_EMAILS (env var) — vérification côté serveur uniquement" />
            <B text="Impersonation : génère un magic link Supabase qui connecte l'admin en tant qu'utilisateur (bannière orange visible)" />
          </View>
        </View>

        <Footer page="2 / 5" label="Flux utilisateurs" />
      </Page>

      {/* ════════ PAGE 3 — Architecture technique ════════ */}
      <Page size="A4" style={s.page}>
        <View style={s.headerStripSmall}>
          <View><Text style={s.brandSmall}>ArchFlow</Text><Text style={[s.tagline, { fontSize: 8 }]}>Dossier d'audit SaaS</Text></View>
          <View style={s.headerRight}><Text style={s.pageTitle}>Architecture technique</Text></View>
        </View>

        {/* Couches */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>ARCHITECTURE EN COUCHES</Text>
          <View style={s.row}>
            <View style={[s.col]}>
              {[
                { label: 'Navigateur (Client)', color: 'blue' as const, items: ['React Server Components + Client Components', 'shadcn/ui + Tailwind CSS', 'Supabase JS (auth tokens)', 'TanStack Table, Recharts, React-PDF'] },
                { label: 'Couche Applicative (Vercel)', color: 'green' as const, items: ['Next.js 14 App Router (SSR + API Routes)', 'Middleware auth (Edge Runtime)', '69 endpoints RESTful avec Zod', 'Upstash QStash (cron reminders)'] },
                { label: 'Couche Données', color: 'gray' as const, items: ['PostgreSQL via Supabase (27 modèles)', 'Prisma ORM 5 (migrations typesafe)', 'Supabase Storage (PDF, docs, logos)', 'Row Level Security (auth.users)'] },
                { label: 'Services Externes', color: 'amber' as const, items: ['Resend (emails transactionnels)', 'Stripe (abonnements + AO payants)', 'Anthropic Claude claude-sonnet-4-6 (import IA)', 'data.gouv.fr (vérification SIRET)'] },
              ].map(layer => (
                <View key={layer.label} style={[s.card, { marginBottom: 6, borderColor: C.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                    <Badge label={layer.label} type={layer.color} />
                  </View>
                  <View style={s.row}>
                    {layer.items.map((item, i) => (
                      <View key={i} style={{ flex: 1 }}>
                        <B text={item} />
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
            <View style={[{ width: 150 }]}>
              <View style={[s.card, s.cardGreen, { marginBottom: 6 }]}>
                <Text style={[s.cardTitle, { color: C.green }]}>Shell modulaire</Text>
                <Text style={s.cardBody}>
                  Architecture cœur + modules indépendants. Les modules ne communiquent jamais directement.
                </Text>
                <View style={s.divider} />
                <B text="Shell : auth, nav, notifs, settings, billing" />
                <B text="Module DPGF : actif ✓" />
                <B text="Module Chantier : futur" color="amber" />
                <B text="Module Facturation : futur" color="amber" />
              </View>
              <View style={[s.card, s.cardAmber]}>
                <Text style={[s.cardTitle, { color: C.amber }]}>Sécurité</Text>
                <B text="JWT HS256 pour les invitations (jose)" />
                <B text="Tokens à usage unique" />
                <B text="RLS Supabase sur auth.users" />
                <B text="requireRole() sur chaque endpoint" />
                <B text="Données archi filtrées pour COMPANY" />
                <B text="agencyId vérifié (isolation multi-tenant)" />
              </View>
            </View>
          </View>
        </View>

        {/* Modèle de données simplifié */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>MODÈLE DE DONNÉES — RELATIONS CLÉS</Text>
          <View style={s.row}>
            <View style={s.col}>
              <View style={[s.card, s.cardGray]}>
                <Text style={s.subTitle}>Hiérarchie principale</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <FlowBox label="Agency" color="green" />
                  <Arrow /><FlowBox label="Project" color="green" />
                  <Arrow /><FlowBox label="DPGF" color="green" />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Text style={[s.flowSub, { color: C.text3, width: 55 }]}></Text>
                  <Text style={s.flowArrowV}>↓</Text>
                  <Text style={[s.flowSub, { marginLeft: 10 }]}></Text>
                  <Text style={s.flowArrowV}>↓</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <FlowBox label="User" sub="(membres agence)" color="blue" />
                  <Arrow /><FlowBox label="AO" sub="Appel d'offre" color="amber" />
                  <Arrow /><FlowBox label="Lot → Post" color="amber" />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Text style={s.flowArrowV}></Text>
                  <Text style={[s.flowSub, { marginLeft: 10 }]}></Text>
                  <Text style={s.flowArrowV}>↓</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <FlowBox label="Contact" sub="(annuaire)" color="gray" />
                  <Arrow /><FlowBox label="AOCompany" sub="entreprise × AO" color="amber" />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Text style={[s.flowSub, { marginLeft: 60 }]}></Text>
                  <Text style={s.flowArrowV}>↓</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <FlowBox label="" color="gray" />
                  <Arrow />
                  <FlowBox label="Offer → OfferPost" color="green" />
                </View>
              </View>
            </View>
            <View style={s.col}>
              <View style={[s.card, s.cardGray]}>
                <Text style={s.subTitle}>Entités satellites</Text>
                <BB text="Document" sub="Lié au DPGF et/ou AO — versioning (revision++) · suivi lectures (DocumentRead)" />
                <BB text="AdminDoc" sub="Kbis, RC Pro, Décennale, RIB, URSSAF — statuts PENDING/VALID/EXPIRED/REJECTED" />
                <BB text="QA / QAAnswer" sub="Questions entreprises → réponses architecte · visibilité PUBLIC / PRIVATE" />
                <BB text="AIImport" sub="PROCESSING → REVIEW → IMPORTED — log complet des imports IA" />
                <BB text="AOScoringConfig" sub="Poids par critère (prix 30%, docs 25%, fiabilité 20%…)" />
                <BB text="Notification" sub="Système in-app centré sur l'user (readAt nullable)" />
              </View>
              <View style={[s.card, s.cardGreen]}>
                <Text style={s.subTitle}>Multi-tenant</Text>
                <B text="Isolation par agencyId sur tous les modèles archi" />
                <B text="Entreprises : User + Agency propre (isolation naturelle)" />
                <B text="Permissions par projet : ProjectPermission (module + JSON)" />
              </View>
            </View>
          </View>
        </View>

        {/* Auth diagram */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>AUTHENTIFICATION — 3 MÉCANISMES</Text>
          <View style={s.row}>
            {[
              { title: 'Session Supabase', color: 'green' as const, items: ['Architectes, Collaborators, Admins, Clients', 'Cookie httpOnly — SSR via createServerClient()', 'Middleware Next.js vérifie chaque requête', 'getUserWithProfile() — upsert au 1er login'] },
              { title: 'JWT Invitation', color: 'amber' as const, items: ['Entreprises uniquement — portail + inscription', 'HS256 signé avec INVITE_JWT_SECRET', 'Payload : { email, aoId, aoCompanyId }', 'Expiry : deadline AO + 48h · usage unique'] },
              { title: 'Admin (env var)', color: 'red' as const, items: ['requireAdmin() vérifie ADMIN_EMAILS', 'Pas de rôle DB — env var côté serveur', 'Impersonation via generateLink(magiclink)', 'Bannière localStorage cross-onglets'] },
            ].map(m => (
              <View key={m.title} style={[s.card, { flex: 1, borderColor: C.border }]}>
                <Badge label={m.title} type={m.color} />
                <View style={{ marginTop: 6 }}>
                  {m.items.map(item => <B key={item} text={item} color={m.color} />)}
                </View>
              </View>
            ))}
          </View>
        </View>

        <Footer page="3 / 5" label="Architecture technique" />
      </Page>

      {/* ════════ PAGE 4 — Audit : Forces, Faiblesses, Risques ════════ */}
      <Page size="A4" style={s.page}>
        <View style={s.headerStripSmall}>
          <View><Text style={s.brandSmall}>ArchFlow</Text><Text style={[s.tagline, { fontSize: 8 }]}>Dossier d'audit SaaS</Text></View>
          <View style={s.headerRight}><Text style={s.pageTitle}>Audit : Forces & Risques</Text></View>
        </View>

        <View style={s.row}>
          {/* Forces */}
          <View style={s.col}>
            <Text style={s.sectionTitle}>FORCES ✓</Text>

            <View style={[s.card, s.cardGreen]}>
              <Text style={[s.cardTitle, { color: C.green }]}>Domaine bien modélisé</Text>
              <B text="DPGF complet : lots → sous-lots → postes (ref auto, optionnel, bibliothèque)" />
              <B text="Cycle AO entier : DRAFT → SENT → IN_PROGRESS → CLOSED → ANALYSED → AWARDED" />
              <B text="Scoring multicritères configurable par AO (5 critères, poids ajustables)" />
              <B text="Diff snapshot : détecte les modifications DPGF après envoi AO" />
            </View>

            <View style={[s.card, s.cardGreen]}>
              <Text style={[s.cardTitle, { color: C.green }]}>Stack moderne et robuste</Text>
              <B text="Next.js App Router — SSR natif, API Routes co-localisées" />
              <B text="Prisma 5 — migrations versionnées, types auto-générés" />
              <B text="Supabase — auth + storage managés, RLS intégrée" />
              <B text="Zod — validation bout-en-bout request → response" />
              <B text="Vercel — déploiement automatique à chaque push main" />
            </View>

            <View style={[s.card, s.cardGreen]}>
              <Text style={[s.cardTitle, { color: C.green }]}>Sécurité des données</Text>
              <B text="Estimatif archi jamais exposé au portail entreprise" />
              <B text="Isolation agencyId vérifiée sur chaque requête" />
              <B text="Tokens JWT à usage unique (tokenUsedAt)" />
              <B text="Middleware auth protège toutes les routes sensibles" />
            </View>

            <View style={[s.card, s.cardBlue]}>
              <Text style={[s.cardTitle, { color: C.blue }]}>Différenciation produit</Text>
              <B text="Import IA (Claude claude-sonnet-4-6) : Excel/PDF → DPGF structuré" color="blue" />
              <B text="Portail entreprise : flux complet sans compte pré-existant" color="blue" />
              <B text="Docs admin vérifiés : Kbis, décennale, RC Pro, URSSAF, RIB" color="blue" />
              <B text="Q&A structuré public/privé par post de DPGF" color="blue" />
            </View>
          </View>

          {/* Risques */}
          <View style={s.col}>
            <Text style={s.sectionTitle}>RISQUES & FAIBLESSES ⚠</Text>

            <View style={s.riskHigh}>
              <Text style={[s.riskTitle, { color: C.red }]}>🔴 CRITIQUE — Scalabilité acquisition</Text>
              <Text style={[s.riskBody, { color: C.red }]}>
                Onboarding 100% manuel (waitlist → approval admin → invite). Impossible de scaler sans self-serve. Chaque inscription nécessite une action humaine.
              </Text>
            </View>

            <View style={s.riskHigh}>
              <Text style={[s.riskTitle, { color: C.red }]}>🔴 CRITIQUE — Pas de tests automatisés</Text>
              <Text style={[s.riskBody, { color: C.red }]}>
                Aucun test unitaire, d'intégration ou E2E détecté. Le flux invitation entreprise a nécessité 5+ correctifs consécutifs en production. Risque de régressions élevé.
              </Text>
            </View>

            <View style={s.riskMed}>
              <Text style={[s.riskTitle, { color: C.amber }]}>🟡 MAJEUR — Données archi incohérentes</Text>
              <Text style={[s.riskBody, { color: C.amber }]}>
                IDs Prisma CUID ≠ IDs Supabase Auth UUID pour les COMPANY users. Nécessite des $queryRaw sur auth.users pour les opérations admin. Fragilité structurelle.
              </Text>
            </View>

            <View style={s.riskMed}>
              <Text style={[s.riskTitle, { color: C.amber }]}>🟡 MAJEUR — Monitoring production absent</Text>
              <Text style={[s.riskBody, { color: C.amber }]}>
                Pas de Sentry, pas d'alerting. Les bugs prod sont découverts par les utilisateurs. Logs Vercel uniquement (retention limitée). Pas de dashboard d'erreurs.
              </Text>
            </View>

            <View style={s.riskMed}>
              <Text style={[s.riskTitle, { color: C.amber }]}>🟡 MAJEUR — Modules futurs non planifiés</Text>
              <Text style={[s.riskBody, { color: C.amber }]}>
                Chantier et Facturation mentionnés mais aucune interface ni API. L'architecture shell modulaire est prête mais sans roadmap détaillée ni ETA.
              </Text>
            </View>

            <View style={s.riskLow}>
              <Text style={[s.riskTitle, { color: C.blue }]}>🔵 MINEUR — Pricing non public</Text>
              <Text style={[s.riskBody, { color: C.blue }]}>
                Aucune page tarifaire publique. Les plans SOLO/STUDIO/AGENCY existent en DB mais sans prix affichés. Friction à la conversion.
              </Text>
            </View>

            <View style={s.riskLow}>
              <Text style={[s.riskTitle, { color: C.blue }]}>🔵 MINEUR — Pas d'analytics produit</Text>
              <Text style={[s.riskBody, { color: C.blue }]}>
                Pas de Posthog, Mixpanel ou équivalent. lastSeenAt stocké manuellement mais pas d'entonnoir, pas de rétention, pas de feature flags.
              </Text>
            </View>

            <View style={s.riskLow}>
              <Text style={[s.riskTitle, { color: C.blue }]}>🔵 MINEUR — Logique métier dans les composants</Text>
              <Text style={[s.riskBody, { color: C.blue }]}>
                Certains composants client (PortalPageClient, AnalysisPageClient) contiennent de la logique qui devrait être dans des hooks custom ou lib/.
              </Text>
            </View>
          </View>
        </View>

        <Footer page="4 / 5" label="Audit Forces & Risques" />
      </Page>

      {/* ════════ PAGE 5 — Recommandations & Roadmap ════════ */}
      <Page size="A4" style={s.page}>
        <View style={s.headerStripSmall}>
          <View><Text style={s.brandSmall}>ArchFlow</Text><Text style={[s.tagline, { fontSize: 8 }]}>Dossier d'audit SaaS</Text></View>
          <View style={s.headerRight}><Text style={s.pageTitle}>Recommandations & Roadmap</Text></View>
        </View>

        {/* Recommandations */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>RECOMMANDATIONS PRIORITAIRES</Text>
          <View style={s.table}>
            <View style={s.thead}>
              <Text style={[s.theadCell, { flex: 0.4 }]}>Prio</Text>
              <Text style={[s.theadCell, { flex: 2 }]}>Action</Text>
              <Text style={[s.theadCell, { flex: 2.5 }]}>Détail</Text>
              <Text style={[s.theadCell, { flex: 1.1 }]}>Impact</Text>
            </View>
            {[
              ['🔴 P0', 'Tests E2E flux invitation', 'Playwright sur le cycle complet : invite → register → portal → submit offer', 'Stabilité prod'],
              ['🔴 P0', 'Self-serve onboarding', 'Inscription directe sans waitlist — email de bienvenue + essai 14j', 'Acquisition ×10'],
              ['🔴 P0', 'Error monitoring', 'Sentry.io — alertes Slack sur erreurs prod, traces API, performance', 'Fiabilité'],
              ['🟡 P1', 'Page pricing publique', 'Afficher les plans + CTA — prerequis à toute campagne marketing', 'Conversion'],
              ['🟡 P1', 'Analytics produit', 'Posthog : entonnoir onboarding, feature adoption, rétention J7/J30', 'Décisions produit'],
              ['🟡 P1', 'Unifier les IDs COMPANY', 'Stocker supabaseAuthId sur User pour éviter les $queryRaw auth.users', 'Maintenabilité'],
              ['🟡 P1', 'Essai gratuit ou freemium', 'Plan gratuit limité (1 projet, 3 entreprises) → conversion payante', 'Acquisition'],
              ['🔵 P2', 'Roadmap modules publique', 'Page /features avec statuts Chantier et Facturation — gère les attentes', 'Positionnement'],
              ['🔵 P2', 'API publique (webhooks)', 'Permettre aux cabinets d\'intégrer leurs outils (ERP, compta)', 'Rétention'],
              ['🔵 P2', 'Mobile responsive', 'Portail entreprise utilisé sur mobile — auditer et adapter', 'UX'],
              ['🔵 P2', 'Refactoring hooks', 'Extraire logique de PortalPageClient, AnalysisPageClient → hooks custom', 'Maintenabilité'],
              ['🔵 P3', 'Documentation API', 'OpenAPI/Swagger pour les intégrations futures', 'Ecosystème'],
            ].map(([prio, action, detail, impact], i) => (
              <View key={action} style={i % 2 === 0 ? s.trow : s.trowAlt}>
                <Text style={[s.tcell, { flex: 0.4, fontSize: 7 }]}>{prio}</Text>
                <Text style={[s.tcell, { flex: 2, fontFamily: 'Helvetica-Bold', fontSize: 7.5 }]}>{action}</Text>
                <Text style={[s.tcellMuted, { flex: 2.5, fontSize: 7 }]}>{detail}</Text>
                <Text style={[s.tcell, { flex: 1.1, fontSize: 7, color: C.green }]}>{impact}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Roadmap */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>ROADMAP SUGGÉRÉE</Text>
          <View style={s.row}>
            {[
              {
                label: 'S15 — Stabilité', badge: 'amber',
                items: [
                  'Tests E2E Playwright (flux critiques)',
                  'Sentry monitoring production',
                  'Unification IDs COMPANY',
                  'Correctifs UX portail mobile',
                ],
              },
              {
                label: 'S16 — Croissance', badge: 'green',
                items: [
                  'Self-serve onboarding (sans waitlist)',
                  'Page pricing publique',
                  'Freemium / essai 14 jours',
                  'Analytics Posthog',
                ],
              },
              {
                label: 'S17 — Rétention', badge: 'blue',
                items: [
                  'Module Chantier (MVP)',
                  'Notifications email enrichies',
                  'Rapport PDF automatique après clôture AO',
                  'Tableau de bord MRR public',
                ],
              },
              {
                label: 'S18 — Écosystème', badge: 'gray',
                items: [
                  'Module Facturation (MVP)',
                  'API publique + webhooks',
                  'Intégrations (Pennylane, Notion…)',
                  'Marketplace d\'entreprises',
                ],
              },
            ].map(phase => (
              <View key={phase.label} style={[s.card, s.cardGray, { flex: 1 }]}>
                <Badge label={phase.label} type={phase.badge as 'amber' | 'green' | 'blue' | 'gray'} />
                <View style={{ marginTop: 8 }}>
                  {phase.items.map(item => <B key={item} text={item} />)}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Questions pour l'auditeur */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>QUESTIONS OUVERTES POUR L'AUDIT</Text>
          <View style={s.row}>
            <View style={s.col}>
              <View style={[s.card, s.cardAmber]}>
                <Text style={[s.cardTitle, { color: C.amber }]}>Stratégie commerciale</Text>
                <B text="Quel pricing pour le marché FR (architectes indépendants) ?" color="amber" />
                <B text="Le modèle waitlist est-il un frein ou un asset (exclusivité) ?" color="amber" />
                <B text="Faut-il cibler d'abord les cabinets ou les promoteurs ?" color="amber" />
                <B text="Comment gérer la saisonnalité des AO (printemps/automne) ?" color="amber" />
              </View>
            </View>
            <View style={s.col}>
              <View style={[s.card, s.cardBlue]}>
                <Text style={[s.cardTitle, { color: C.blue }]}>Technique & Produit</Text>
                <B text="Faut-il migrer vers un vrai monorepo (turborepo) pour les modules ?" color="blue" />
                <B text="CQRS/event sourcing pour l'audit trail complet des AO ?" color="blue" />
                <B text="Temps réel (WebSockets) pour le suivi des offres en cours ?" color="blue" />
                <B text="Signature électronique des marchés (DocuSign / Yousign) ?" color="blue" />
              </View>
            </View>
            <View style={s.col}>
              <View style={[s.card, s.cardGreen]}>
                <Text style={[s.cardTitle, { color: C.green }]}>Marché & Réglementation</Text>
                <B text="Conformité RGPD : durée de conservation des données AO ?" />
                <B text="Les DPGF sont-ils couverts par le secret des affaires ?" />
                <B text="Intégration DEMAT (dématérialisation marchés publics) ?" />
                <B text="Certification qualifiée pour les AO >40k€ (MAPA) ?" />
              </View>
            </View>
          </View>
        </View>

        {/* Contact */}
        <View style={[s.card, { backgroundColor: C.green, borderColor: C.green, marginTop: 4 }]}>
          <View style={s.row}>
            <View style={s.col}>
              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', marginBottom: 3 }}>ArchFlow — Plateforme DPGF & Consultation d'entreprises</Text>
              <Text style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.75)' }}>Document confidentiel préparé pour audit externe · {date}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
              <Text style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.75)' }}>Stack : Next.js 14 · Prisma · Supabase · Vercel</Text>
              <Text style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.75)' }}>Sprint actuel : S14 · Branch main · Production live</Text>
            </View>
          </View>
        </View>

        <Footer page="5 / 5" label="Recommandations" />
      </Page>

    </Document>
  )
}

// ── Run ────────────────────────────────────────────────────────────────────
const outputPath = path.join(__dirname, '..', 'archflow-saas-audit.pdf')
renderToFile(<AuditDoc />, outputPath)
  .then(() => console.log(`✅ PDF généré : ${outputPath}`))
  .catch((err: unknown) => { console.error('❌ Erreur:', err); process.exit(1) })
