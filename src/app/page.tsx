import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getUserWithProfile } from '@/lib/auth'
import { Navbar } from '@/components/marketing/Navbar'
import { FAQAccordion } from '@/components/marketing/FAQAccordion'

export const metadata: Metadata = {
  title: "ArchFlow — La consultation d'entreprises digitalisée",
  description:
    "ArchFlow remplace Excel et les emails pour gérer vos DPGF, lancer vos appels d'offres et analyser les offres. Conçu pour les architectes d'intérieur.",
}

// ── Constantes de style ──────────────────────────────────
const C = {
  maxW: { maxWidth: '1200px', margin: '0 auto', padding: '0 24px' },
  section: { padding: '96px 0' },
  green: '#1A5C3A',
  greenMid: '#2D7A50',
  greenLight: '#EAF3ED',
  greenBtn: '#1F6B44',
  text: '#1A1A18',
  text2: '#6B6B65',
  text3: '#9B9B94',
  border: '#E8E8E3',
  bg: '#F8F8F6',
  surface: '#FFFFFF',
  surface2: '#F3F3F0',
  red: '#9B1C1C',
  redLight: '#FEE8E8',
  amber: '#B45309',
  amberLight: '#FEF3E2',
}

// ── Helpers ──────────────────────────────────────────────

function SectionTitle({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <h2
      style={{
        fontFamily: '"DM Serif Display", serif',
        fontSize: 'clamp(28px, 4vw, 44px)',
        color: C.text, fontWeight: 400, lineHeight: 1.15,
        marginBottom: '16px',
        textAlign: center ? 'center' : undefined,
      }}
    >
      {children}
    </h2>
  )
}

function SectionSub({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <p
      style={{
        fontSize: '17px', color: C.text2, lineHeight: 1.7, maxWidth: '560px',
        margin: center ? '0 auto' : undefined,
        textAlign: center ? 'center' : undefined,
      }}
    >
      {children}
    </p>
  )
}

// ── HERO ─────────────────────────────────────────────────

function HeroSection() {
  const SCORES = [
    { name: 'Entreprise Martin', score: 92, color: C.green, bg: C.greenLight },
    { name: 'Électricité Dupont', score: 78, color: C.amber, bg: C.amberLight },
    { name: 'SARL Plâtrerie Sud', score: 61, color: C.red, bg: C.redLight },
  ]

  const ROWS = [
    { ref: '01.01', title: 'Cloisons BA13 doublées', unit: 'ml', price: '38 €' },
    { ref: '01.02', title: 'Enduit de finition', unit: 'm²', price: '12 €' },
    { ref: '02.01', title: 'Tableau élect. 24 modules', unit: 'u', price: '1 200 €' },
    { ref: '02.02', title: 'Prises & interrupteurs', unit: 'u', price: '45 €' },
  ]

  return (
    <section style={{ background: C.bg, paddingTop: '120px', paddingBottom: '80px' }}>
      <div style={C.maxW}>
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Colonne gauche */}
          <div className="land-fade-up">
            {/* Badge pill */}
            <div
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: C.greenLight, padding: '6px 14px', borderRadius: '100px',
                marginBottom: '28px',
              }}
            >
              <span>✨</span>
              <span style={{ fontSize: '13px', color: C.green, fontWeight: 500 }}>
                Nouveau — Import DPGF par Intelligence Artificielle
              </span>
            </div>

            {/* H1 */}
            <h1
              style={{
                fontFamily: '"DM Serif Display", serif',
                fontSize: 'clamp(36px, 5vw, 62px)',
                lineHeight: 1.08, color: C.text,
                margin: '0 0 20px',
              }}
            >
              La consultation d&apos;entreprises,{' '}
              <br className="hidden sm:block" />
              enfin{' '}
              <em style={{ color: C.green, fontStyle: 'italic' }}>digitalisée</em>
            </h1>

            {/* Sous-titre */}
            <p style={{ fontSize: '18px', color: C.text2, lineHeight: 1.7, maxWidth: '480px', margin: '0 0 32px' }}>
              ArchFlow remplace Excel et les emails pour gérer vos DPGF,
              lancer vos appels d&apos;offres et analyser les offres en un clic.
            </p>

            {/* CTA */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '40px' }}>
              <a
                href="/register"
                style={{
                  padding: '14px 28px', background: C.greenBtn, color: 'white',
                  borderRadius: '8px', fontSize: '15px', fontWeight: 500,
                  textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px',
                }}
              >
                Commencer gratuitement →
              </a>
              <a
                href="#features"
                style={{
                  padding: '14px 28px', background: 'transparent', color: C.text,
                  borderRadius: '8px', fontSize: '15px', fontWeight: 500,
                  textDecoration: 'none', border: `1px solid ${C.border}`,
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                }}
              >
                ▶ Voir la démo
              </a>
            </div>

            {/* Social proof */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex' }}>
                {['#1A5C3A', '#2D7A50', '#4A9268', '#6BAD85', '#8DC8A2'].map((bg, i) => (
                  <div
                    key={i}
                    style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: bg, border: '2px solid white',
                      marginLeft: i > 0 ? '-10px' : 0,
                      position: 'relative', zIndex: 5 - i,
                    }}
                  />
                ))}
              </div>
              <p style={{ fontSize: '14px', color: C.text2, margin: 0 }}>
                Déjà utilisé par{' '}
                <strong style={{ color: C.text }}>200+ cabinets</strong>{' '}
                d&apos;architecture
              </p>
            </div>
          </div>

          {/* Colonne droite — mockup navigateur */}
          <div
            className="land-fade-up-delay hidden md:block"
            style={{ position: 'relative', paddingBottom: '32px', paddingRight: '28px' }}
          >
            {/* Fenêtre navigateur */}
            <div
              style={{
                borderRadius: '12px', overflow: 'hidden',
                border: `1px solid ${C.border}`,
                boxShadow: '0 24px 64px rgba(0,0,0,.13)',
                background: C.surface,
              }}
            >
              {/* Chrome bar */}
              <div
                style={{
                  background: C.surface2, padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: '7px',
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                {['#FF5F57', '#FFBD2E', '#28C840'].map((c) => (
                  <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />
                ))}
                <div
                  style={{
                    flex: 1, background: 'white', borderRadius: '6px',
                    padding: '3px 12px', fontSize: '11px', color: C.text3,
                    textAlign: 'center', marginLeft: '8px',
                  }}
                >
                  app.archflow.fr/dpgf/villa-martignon
                </div>
              </div>

              {/* App content */}
              <div style={{ background: C.bg, padding: '14px' }}>
                {/* Header projet */}
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontFamily: '"DM Serif Display", serif', fontSize: '15px', color: C.text, margin: '0 0 4px' }}>
                    Villa Martignon — Paris 16e
                  </p>
                  <span
                    style={{
                      display: 'inline-block', background: C.amberLight, color: C.amber,
                      padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 500,
                    }}
                  >
                    AO en cours
                  </span>
                </div>

                {/* Stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '12px' }}>
                  {[
                    { label: 'Estimatif total', value: '148 500 €', color: C.text },
                    { label: 'Offres reçues', value: '3 / 5', color: C.text },
                    { label: 'Meilleure offre', value: '−12 %', color: C.green },
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
                        background: 'white', borderRadius: '8px',
                        padding: '9px 10px', border: `1px solid ${C.border}`,
                      }}
                    >
                      <p style={{ fontSize: '9px', color: C.text3, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>{s.label}</p>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Mini tableau DPGF */}
                <div style={{ background: 'white', borderRadius: '8px', border: `1px solid ${C.border}`, overflow: 'hidden', fontSize: '11px' }}>
                  {/* Header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 36px 68px', padding: '5px 10px', background: C.surface2, borderBottom: `1px solid ${C.border}`, color: C.text3, fontWeight: 500 }}>
                    <span>Réf.</span><span>Intitulé</span><span>U</span><span style={{ textAlign: 'right' }}>PU</span>
                  </div>
                  {/* Lot 1 */}
                  <div style={{ padding: '4px 10px', background: C.greenLight, color: C.green, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>
                    Lot 1 — Plâtrerie
                  </div>
                  {ROWS.slice(0, 2).map((r) => (
                    <div key={r.ref} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 36px 68px', padding: '5px 10px', borderBottom: `1px solid ${C.border}`, color: C.text }}>
                      <span style={{ color: C.text3 }}>{r.ref}</span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</span>
                      <span style={{ color: C.text2 }}>{r.unit}</span>
                      <span style={{ fontWeight: 600, textAlign: 'right' }}>{r.price}</span>
                    </div>
                  ))}
                  {/* Lot 2 */}
                  <div style={{ padding: '4px 10px', background: C.greenLight, color: C.green, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>
                    Lot 2 — Électricité
                  </div>
                  {ROWS.slice(2).map((r) => (
                    <div key={r.ref} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 36px 68px', padding: '5px 10px', borderBottom: `1px solid ${C.border}`, color: C.text }}>
                      <span style={{ color: C.text3 }}>{r.ref}</span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</span>
                      <span style={{ color: C.text2 }}>{r.unit}</span>
                      <span style={{ fontWeight: 600, textAlign: 'right' }}>{r.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Widget flottant */}
            <div
              className="land-float"
              style={{
                position: 'absolute', bottom: 0, right: 0,
                background: 'white', borderRadius: '12px', padding: '14px 16px',
                width: '210px', boxShadow: '0 8px 32px rgba(0,0,0,.13)',
                border: `1px solid ${C.border}`,
              }}
            >
              <p style={{ fontSize: '12px', fontWeight: 600, color: C.text, margin: '0 0 12px' }}>
                Analyse des offres
              </p>
              {SCORES.map((s) => (
                <div key={s.name} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: C.text2 }}>{s.name}</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: s.color }}>{s.score}/100</span>
                  </div>
                  <div style={{ height: '4px', background: C.surface2, borderRadius: '2px' }}>
                    <div style={{ height: '100%', width: `${s.score}%`, background: s.color, borderRadius: '2px', transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── LOGOS ─────────────────────────────────────────────────

function LogosBand() {
  const AGENCIES = ['Durand Architecture', 'Atelier Moreau', 'Studio Lefèvre', 'Cabinet Blanc', 'Haussmann & Co.']
  return (
    <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: '28px 0' }}>
      <div style={{ ...C.maxW, textAlign: 'center' }}>
        <p style={{ fontSize: '12px', color: C.text3, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 500, marginBottom: '16px' }}>
          Ils nous font confiance
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
          {AGENCIES.map((a) => (
            <span
              key={a}
              style={{
                padding: '7px 18px', borderRadius: '100px',
                background: C.surface2, color: C.text2,
                fontSize: '14px', fontWeight: 500, border: `1px solid ${C.border}`,
              }}
            >
              {a}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── PROBLÈME / SOLUTION ──────────────────────────────────

function ProblemSection() {
  const CARDS = [
    {
      icon: '📊',
      avant: 'DPGF sur Excel — formules cassées, colonnes perdues, dizaines de versions',
      apres: 'Tableau collaboratif intuitif avec bibliothèque d\'intitulés et calculs automatiques',
    },
    {
      icon: '📧',
      avant: 'Plans envoyés par email — versions qui se multiplient, pièces introuvables',
      apres: 'Portail DCE centralisé — dernières versions accessibles 24h/24 par toutes les entreprises',
    },
    {
      icon: '🔢',
      avant: 'Comparaison manuelle — copier-coller des prix dans un tableau Excel de fortune',
      apres: 'Analyse automatique multicritères, graphiques et recommandations en un clic',
    },
  ]

  return (
    <section style={{ ...C.section, background: C.bg }}>
      <div style={C.maxW}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <SectionTitle center>Fini les DPGF sur Excel, les emails qui se perdent</SectionTitle>
          <SectionSub center>
            Voyez concrètement comment ArchFlow transforme votre quotidien
          </SectionSub>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {CARDS.map((card) => (
            <div
              key={card.icon}
              className="land-card-hover"
              style={{
                background: 'white', borderRadius: '14px',
                border: `1px solid ${C.border}`,
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '24px 20px 12px', textAlign: 'center', fontSize: '36px' }}>
                {card.icon}
              </div>
              <div style={{ padding: '0 20px 24px' }}>
                <div style={{ background: C.redLight, borderRadius: '8px', padding: '12px', marginBottom: '10px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: C.red, textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 5px' }}>Avant</p>
                  <p style={{ fontSize: '13px', color: C.text2, margin: 0, lineHeight: 1.55 }}>{card.avant}</p>
                </div>
                <div style={{ textAlign: 'center', color: C.text3, fontSize: '18px', margin: '8px 0' }}>↓</div>
                <div style={{ background: C.greenLight, borderRadius: '8px', padding: '12px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 5px' }}>Après</p>
                  <p style={{ fontSize: '13px', color: C.text2, margin: 0, lineHeight: 1.55 }}>{card.apres}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── FEATURES ─────────────────────────────────────────────

function FeaturesSection() {
  const FEATURES = [
    { icon: '📋', title: 'DPGF intelligent', desc: "Tableau éditeur en ligne — lots, sous-lots, postes. Bibliothèque d'intitulés, calculs automatiques, glisser-déposer." },
    { icon: '🤖', title: 'Import IA', desc: "Importez n'importe quel DPGF Excel ou PDF. L'IA reconstruit la structure en moins de 30 secondes avec revue avant import." },
    { icon: '📨', title: 'Appel d\'offre digital', desc: "Invitez les entreprises par email. Portail dédié par AO, DCE intégré, Q&A centralisée, traçabilité complète." },
    { icon: '⚖️', title: 'Analyse multicritères', desc: 'Score global /100 par entreprise : prix, documents admin, délai de réponse, divergences de métrés, fiabilité SIRET.' },
    { icon: '🔍', title: 'Vérification SIRET', desc: "Vérification automatique auprès de l'INSEE Sirene. Badge vert/orange/rouge selon la cohérence des informations." },
    { icon: '👤', title: 'Espace client', desc: "Partagez une vue synthèse sécurisée avec votre client. Contrôlez précisément les informations visibles." },
  ]

  return (
    <section id="features" style={{ ...C.section, background: C.surface }}>
      <div style={C.maxW}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <SectionTitle center>Tout ce dont vous avez besoin</SectionTitle>
          <SectionSub center>
            Une plateforme complète, conçue spécifiquement pour les cabinets d&apos;architecture d&apos;intérieur
          </SectionSub>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="land-card-hover"
              style={{
                background: C.bg, borderRadius: '14px', padding: '28px 24px',
                border: `1px solid ${C.border}`,
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '14px' }}>{f.icon}</div>
              <h3
                style={{
                  fontFamily: '"DM Serif Display", serif',
                  fontSize: '19px', color: C.text, margin: '0 0 10px', fontWeight: 400,
                }}
              >
                {f.title}
              </h3>
              <p style={{ fontSize: '14px', color: C.text2, lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── COMMENT ÇA MARCHE ────────────────────────────────────

function HowItWorksSection() {
  const STEPS = [
    {
      n: '1',
      title: 'Créez votre DPGF',
      desc: "Importez votre fichier Excel ou créez votre tableau directement dans ArchFlow. Ajoutez lots, postes, quantités et prix estimatifs.",
    },
    {
      n: '2',
      title: "Lancez l'appel d'offre",
      desc: "Invitez les entreprises par email en 2 clics. Elles accèdent à un portail dédié pour consulter les plans et saisir leurs prix.",
    },
    {
      n: '3',
      title: 'Analysez et choisissez',
      desc: "Comparez les offres sur un tableau multicritères. Score /100 automatique, graphiques, export PDF et recommandation intelligente.",
    },
  ]

  return (
    <section style={{ ...C.section, background: C.bg }}>
      <div style={C.maxW}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <SectionTitle center>Comment ça marche ?</SectionTitle>
          <SectionSub center>Opérationnel en moins de 10 minutes</SectionSub>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {STEPS.map((step, i) => (
            <div key={step.n} style={{ position: 'relative', textAlign: 'center' }}>
              {/* Ligne pointillée entre les étapes */}
              {i < STEPS.length - 1 && (
                <div
                  className="hidden md:block"
                  style={{
                    position: 'absolute', top: '24px', left: '60%', right: '-40%',
                    height: '1px',
                    borderTop: `2px dashed ${C.border}`,
                  }}
                />
              )}

              {/* Cercle numéroté */}
              <div
                style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  background: C.green, color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', fontWeight: 700, margin: '0 auto 20px',
                  position: 'relative', zIndex: 1,
                }}
              >
                {step.n}
              </div>

              <h3
                style={{
                  fontFamily: '"DM Serif Display", serif',
                  fontSize: '20px', color: C.text, margin: '0 0 10px', fontWeight: 400,
                }}
              >
                {step.title}
              </h3>
              <p style={{ fontSize: '14px', color: C.text2, lineHeight: 1.7, margin: 0 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── TARIFS ───────────────────────────────────────────────

function PricingSection() {
  const PLANS = [
    {
      name: 'Solo',
      price: '49',
      desc: 'Pour les architectes indépendants',
      features: ['1 utilisateur', '5 projets actifs', 'DPGF & AO illimités', 'Import IA (10/mois)', 'Support email'],
      cta: 'Commencer',
      highlighted: false,
    },
    {
      name: 'Studio',
      price: '99',
      desc: 'Pour les petits cabinets',
      badge: '⭐ Le plus populaire',
      features: ['3 utilisateurs', 'Projets illimités', 'DPGF & AO illimités', 'Import IA illimité', 'Espace client', 'Support prioritaire'],
      cta: 'Commencer — 14 jours offerts',
      highlighted: true,
    },
    {
      name: 'Agence',
      price: '199',
      desc: 'Pour les grandes structures',
      features: ['10 utilisateurs', 'Projets illimités', 'DPGF & AO illimités', 'Import IA illimité', 'Espace client', 'API & intégrations', 'Support dédié'],
      cta: 'Nous contacter',
      highlighted: false,
    },
  ]

  return (
    <section id="pricing" style={{ ...C.section, background: C.surface }}>
      <div style={C.maxW}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <SectionTitle center>Des tarifs clairs et sans surprise</SectionTitle>
          <SectionSub center>
            Commencez gratuitement pendant 14 jours — aucune carte bancaire requise
          </SectionSub>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              style={{
                background: plan.highlighted ? C.green : 'white',
                borderRadius: '16px', padding: '32px 28px',
                border: plan.highlighted ? 'none' : `1px solid ${C.border}`,
                boxShadow: plan.highlighted ? '0 20px 60px rgba(26,92,58,.25)' : '0 1px 4px rgba(0,0,0,.04)',
                position: 'relative',
              }}
            >
              {plan.badge && (
                <div
                  style={{
                    position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
                    background: '#F59E0B', color: 'white', padding: '4px 14px',
                    borderRadius: '100px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap',
                  }}
                >
                  {plan.badge}
                </div>
              )}

              <p
                style={{
                  fontSize: '12px', fontWeight: 700, letterSpacing: '1px',
                  textTransform: 'uppercase', color: plan.highlighted ? 'rgba(255,255,255,0.7)' : C.text3,
                  margin: '0 0 6px',
                }}
              >
                {plan.name}
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '6px' }}>
                <span
                  style={{
                    fontFamily: '"DM Serif Display", serif',
                    fontSize: '48px', fontWeight: 400,
                    color: plan.highlighted ? 'white' : C.text,
                  }}
                >
                  {plan.price}€
                </span>
                <span style={{ fontSize: '14px', color: plan.highlighted ? 'rgba(255,255,255,0.6)' : C.text3 }}>
                  /mois HT
                </span>
              </div>
              <p style={{ fontSize: '13px', color: plan.highlighted ? 'rgba(255,255,255,0.7)' : C.text2, margin: '0 0 24px' }}>
                {plan.desc}
              </p>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px' }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={{ color: plan.highlighted ? '#86EFAC' : C.green, fontWeight: 700, fontSize: '15px' }}>✓</span>
                    <span style={{ fontSize: '14px', color: plan.highlighted ? 'rgba(255,255,255,0.85)' : C.text2 }}>{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href="/register"
                style={{
                  display: 'block', textAlign: 'center',
                  padding: '12px 20px', borderRadius: '8px',
                  background: plan.highlighted ? 'white' : C.greenBtn,
                  color: plan.highlighted ? C.green : 'white',
                  fontSize: '14px', fontWeight: 600,
                  textDecoration: 'none', border: 'none',
                }}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: '14px', color: C.text3, marginTop: '32px' }}>
          Les entreprises invitées accèdent au portail <strong style={{ color: C.text2 }}>gratuitement</strong>, toujours.
        </p>
      </div>
    </section>
  )
}

// ── FAQ ──────────────────────────────────────────────────

function FAQSection() {
  return (
    <section id="faq" style={{ ...C.section, background: C.bg }}>
      <div style={{ ...C.maxW, maxWidth: '720px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <SectionTitle center>Questions fréquentes</SectionTitle>
        </div>
        <FAQAccordion />
      </div>
    </section>
  )
}

// ── CTA FINAL ────────────────────────────────────────────

function CTASection() {
  return (
    <section style={{ background: C.green, padding: '80px 24px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
        <h2
          style={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: 'clamp(28px, 4vw, 44px)',
            color: 'white', fontWeight: 400, margin: '0 0 16px', lineHeight: 1.2,
          }}
        >
          Prêt à digitaliser vos consultations ?
        </h2>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.75)', margin: '0 0 36px' }}>
          Rejoignez 200+ cabinets qui ont déjà transformé leur façon de travailler
        </p>
        <a
          href="/register"
          style={{
            display: 'inline-block', padding: '16px 40px',
            background: 'white', color: C.green,
            borderRadius: '8px', fontSize: '15px', fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Commencer gratuitement →
        </a>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', marginTop: '16px' }}>
          Sans carte bancaire · Annulable à tout moment
        </p>
      </div>
    </section>
  )
}

// ── FOOTER ───────────────────────────────────────────────

function Footer() {
  return (
    <footer
      id="contact"
      style={{
        background: '#0F3524', padding: '40px 24px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px', margin: '0 auto',
          display: 'flex', flexWrap: 'wrap',
          alignItems: 'center', justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          <span
            style={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: '20px', color: 'white', display: 'block', marginBottom: '4px',
            }}
          >
            ArchFlow
          </span>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            🇪🇺 Hébergé en Europe
          </p>
        </div>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          {['CGU', 'Confidentialité', 'Contact'].map((l) => (
            <a key={l} href="#" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', textDecoration: 'none' }}>
              {l}
            </a>
          ))}
        </div>

        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          © 2026 ArchFlow. Tous droits réservés.
        </p>
      </div>
    </footer>
  )
}

// ── PAGE ─────────────────────────────────────────────────

export default async function LandingPage() {
  const user = await getUserWithProfile()
  if (user) redirect('/dashboard')

  return (
    <div style={{ background: C.bg }}>
      <Navbar />
      <main>
        <HeroSection />
        <LogosBand />
        <ProblemSection />
        <FeaturesSection />
        <HowItWorksSection />
        {process.env.NEXT_PUBLIC_SHOW_PRICING === 'true' && <PricingSection />}
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
