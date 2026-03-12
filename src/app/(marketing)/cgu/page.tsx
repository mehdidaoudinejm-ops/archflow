import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/marketing/Navbar'

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation — ArchFlow",
}

const SECTIONS = [
  {
    title: '1. Objet',
    content: `Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent l'accès et l'utilisation de la plateforme ArchFlow, accessible à l'adresse archflow.fr, éditée par The Blueprint Lab (ci-après « l'Éditeur »).

En accédant à la plateforme ou en créant un compte, l'utilisateur accepte sans réserve les présentes CGU. L'Éditeur se réserve le droit de les modifier à tout moment ; les modifications prennent effet dès leur publication sur le site.`,
  },
  {
    title: '2. Définitions',
    content: `- **Plateforme** : le service en ligne ArchFlow accessible via le site archflow.fr.
- **Utilisateur** : toute personne physique ou morale accédant à la Plateforme.
- **Architecte** : utilisateur titulaire d'un compte professionnel à titre principal.
- **Entreprise** : utilisateur invité par un Architecte pour répondre à un appel d'offres.
- **Client** : tiers bénéficiaire d'un accès limité à certaines données d'un projet.
- **DPGF** : Décomposition du Prix Global et Forfaitaire.
- **AO** : Appel d'Offres.`,
  },
  {
    title: '3. Accès au service',
    content: `L'accès à la Plateforme nécessite la création d'un compte avec une adresse email valide. L'utilisateur s'engage à fournir des informations exactes et à maintenir leur exactitude.

Le compte est personnel et non transférable. L'utilisateur est seul responsable de la confidentialité de ses identifiants. Toute utilisation du compte sous sa responsabilité, y compris en cas d'accès non autorisé non signalé dans les meilleurs délais.

L'Éditeur se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes CGU, sans préavis ni indemnité.`,
  },
  {
    title: '4. Description des services',
    content: `ArchFlow propose notamment les fonctionnalités suivantes :

- Création et gestion de DPGF (lots, postes, bibliothèque d'intitulés)
- Import de DPGF par intelligence artificielle (PDF, Excel)
- Gestion d'appels d'offres digitaux et invitation d'entreprises
- Portail de saisie des prix pour les entreprises
- Dépôt et consultation de documents DCE
- Module de questions-réponses (Q&A)
- Tableau de bord d'analyse et de comparaison des offres
- Espace client sécurisé

Les fonctionnalités disponibles dépendent du plan d'abonnement souscrit.`,
  },
  {
    title: '5. Abonnement et tarification',
    content: `L'utilisation complète de la Plateforme est soumise à un abonnement payant selon les tarifs en vigueur affichés sur le site. Les Entreprises invitées accèdent au portail de saisie gratuitement.

Les abonnements sont facturés mensuellement ou annuellement selon le choix de l'utilisateur. Le paiement est traité par le prestataire Stripe. L'Éditeur ne conserve aucune donnée bancaire.

L'abonnement se renouvelle tacitement jusqu'à résiliation. L'utilisateur peut résilier à tout moment depuis son espace de facturation, la résiliation prenant effet à l'issue de la période en cours.`,
  },
  {
    title: '6. Propriété intellectuelle',
    content: `Tous les éléments constitutifs de la Plateforme (marques, logos, textes, interfaces, code source, base de données) sont la propriété exclusive de l'Éditeur ou de ses concédants.

Les données saisies par l'utilisateur (DPGF, projets, documents) restent sa propriété. L'utilisateur concède à l'Éditeur une licence non exclusive d'utilisation de ces données aux seules fins d'exécution du service.

L'utilisateur s'interdit de copier, reproduire, modifier, décompiler ou tenter d'extraire le code source de la Plateforme.`,
  },
  {
    title: '7. Protection des données personnelles',
    content: `L'Éditeur collecte et traite les données personnelles des utilisateurs conformément au Règlement Général sur la Protection des Données (RGPD — Règlement UE 2016/679).

Les données collectées (nom, email, données de facturation, données de projet) sont utilisées exclusivement pour fournir le service et ne sont pas vendues à des tiers.

Conformément au RGPD, l'utilisateur dispose d'un droit d'accès, de rectification, de suppression et de portabilité de ses données, ainsi que d'un droit d'opposition. Ces droits peuvent être exercés en contactant l'Éditeur à l'adresse : contact@the-blueprint-lab.com.

Les données sont hébergées en Europe (Union Européenne).`,
  },
  {
    title: '8. Responsabilités',
    content: `La Plateforme est fournie « en l'état ». L'Éditeur s'efforce d'assurer une disponibilité maximale mais ne peut garantir une disponibilité ininterrompue.

L'Éditeur ne saurait être tenu responsable des dommages directs ou indirects résultant de l'utilisation ou de l'impossibilité d'utiliser la Plateforme, de la perte de données, ou de décisions prises sur la base des informations présentes sur la Plateforme.

L'utilisateur est seul responsable des données qu'il saisit, des documents qu'il dépose et des personnes qu'il invite sur la Plateforme.`,
  },
  {
    title: '9. Loi applicable et juridiction',
    content: `Les présentes CGU sont régies par le droit français. Tout litige relatif à leur interprétation ou exécution sera soumis aux tribunaux compétents du ressort du siège social de l'Éditeur, sauf disposition légale contraire applicable aux consommateurs.`,
  },
  {
    title: '10. Contact',
    content: `Pour toute question relative aux présentes CGU ou à l'utilisation de la Plateforme, l'utilisateur peut contacter l'Éditeur :

**The Blueprint Lab**
Email : contact@the-blueprint-lab.com

*Dernière mise à jour : mars 2026*`,
  },
]

function renderContent(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('- ')) {
      return (
        <li key={i} style={{ marginBottom: 4, paddingLeft: 4 }}>
          {renderInline(line.slice(2))}
        </li>
      )
    }
    if (line === '') return <br key={i} />
    return <p key={i} style={{ margin: '0 0 8px' }}>{renderInline(line)}</p>
  })
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  )
}

export default function CGUPage() {
  return (
    <div style={{ background: '#F8F8F6', minHeight: '100vh' }}>
      <Navbar />

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '96px 24px 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <Link
            href="/"
            style={{ fontSize: 13, color: '#6B6B65', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24 }}
          >
            ← Retour à l&apos;accueil
          </Link>
          <h1
            style={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: 'clamp(28px, 4vw, 40px)',
              color: '#1A1A18', fontWeight: 400, margin: '0 0 12px',
            }}
          >
            Conditions Générales d&apos;Utilisation
          </h1>
          <p style={{ fontSize: 14, color: '#9B9B94' }}>Dernière mise à jour : mars 2026</p>
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2
                style={{
                  fontFamily: '"DM Serif Display", serif',
                  fontSize: 20, fontWeight: 400,
                  color: '#1A5C3A', margin: '0 0 14px',
                }}
              >
                {section.title}
              </h2>
              <div
                style={{
                  fontSize: 14, color: '#4A4A45', lineHeight: 1.8,
                  background: '#fff', borderRadius: 12,
                  padding: '20px 24px',
                  border: '1px solid #E8E8E3',
                }}
              >
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {renderContent(section.content)}
                </ul>
              </div>
            </section>
          ))}
        </div>

        {/* Footer de page */}
        <div style={{ marginTop: 56, paddingTop: 32, borderTop: '1px solid #E8E8E3', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 13, color: '#9B9B94', margin: 0 }}>
            © 2026 ArchFlow — The Blueprint Lab
          </p>
          <Link
            href="/contact"
            style={{ fontSize: 13, color: '#1A5C3A', textDecoration: 'none', fontWeight: 500 }}
          >
            Nous contacter →
          </Link>
        </div>
      </div>
    </div>
  )
}
