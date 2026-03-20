// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScoringWeights {
  weightPrice: number       // défaut 30
  weightDocuments: number   // défaut 25
  weightReliability: number // défaut 20
  weightDivergences: number // défaut 15
  weightReactivity: number  // défaut 10
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  weightPrice: 30,
  weightDocuments: 25,
  weightReliability: 20,
  weightDivergences: 15,
  weightReactivity: 10,
}

export interface AdminDocInfo {
  type: string   // 'kbis' | 'decennale' | 'rcpro' | 'rib' | 'urssaf'
  status: string // 'PENDING' | 'VALID' | 'EXPIRED' | 'REJECTED'
}

export interface ScoringCompanyInput {
  id: string
  name: string
  total: number | null             // Total de l'offre
  estimatifTotal: number | null    // Estimatif architecte
  totalPosts: number               // Nombre total de postes dans l'AO
  pricedPosts: number              // Nombre de postes effectivement chiffrés
  adminDocs: AdminDocInfo[]        // Documents fournis
  mandatoryDocTypes: string[]      // Types obligatoires pour cet AO spécifique
  siretVerified: boolean           // SIRET vérifié par INSEE
  agencyCreatedAt: string | null   // Date d'immatriculation INSEE (null si non vérifié)
  divergences: number              // Nb postes avec métrés modifiés
  submittedAt: string | null       // Date soumission
  invitedAt: string                // Date invitation (AOCompany.createdAt)
  hasAskedQuestion: boolean        // A posé au moins une question Q&A
  directorNameMatch: boolean | null // null = pas de SIRET pour vérifier
}

export type AlertFlag =
  | 'OFFRE_ANORMALEMENT_BASSE'
  | 'DOSSIER_INCOMPLET'
  | 'DOCUMENT_INVALIDE'
  | 'ENTREPRISE_INACTIVE'
  | 'ENTREPRISE_RECENTE'
  | 'METRES_FORTEMENT_MODIFIES'
  | 'DIRIGEANT_NOM_DIFFERENT'

export type Recommendation = 'RECOMMANDEE' | 'A_ETUDIER' | 'RISQUEE'

export interface CriterionDetail {
  rawScore: number      // 0-100 before weighting
  weightedScore: number // contribution to final score
  weight: number        // weight in %
}

export interface ScoringResult {
  companyId: string
  companyName: string
  globalScore: number    // 0-100
  recommendation: Recommendation
  flags: AlertFlag[]
  criteria: {
    price: CriterionDetail
    documents: CriterionDetail
    reliability: CriterionDetail
    divergences: CriterionDetail
    reactivity: CriterionDetail
  }
  details: {
    priceEcartPct: number | null       // % écart vs estimatif
    pricedPostsRate: number            // % postes chiffrés
    mandatoryDocsMissing: number       // docs obligatoires manquants
    siretStatus: 'VERIFIED' | 'UNVERIFIED' | 'INACTIVE'
    agencyAgeYears: number | null
    divergencePct: number              // % postes modifiés
    responseDelayDays: number | null   // délai invitation→soumission
  }
}

// ─── Mandatory doc types ──────────────────────────────────────────────────────

const MANDATORY_DOCS = ['kbis', 'decennale', 'rcpro', 'rib', 'urssaf']

// ─── CRITÈRE 1 — Prix ─────────────────────────────────────────────────────────

function scorePrix(input: ScoringCompanyInput): { score: number; flags: AlertFlag[] } {
  const flags: AlertFlag[] = []

  if (input.total === null || input.estimatifTotal === null || input.estimatifTotal === 0) {
    return { score: 50, flags }
  }

  const ecartPct = ((input.total - input.estimatifTotal) / input.estimatifTotal) * 100
  const absEcart = Math.abs(ecartPct)

  // Flag offre anormalement basse
  if (ecartPct < -30) {
    flags.push('OFFRE_ANORMALEMENT_BASSE')
  }

  // Score selon écart
  let priceScore: number
  if (absEcart < 5) priceScore = 100
  else if (absEcart < 15) priceScore = 80
  else if (absEcart < 25) priceScore = 60
  else if (absEcart < 35) priceScore = 40
  else priceScore = 20

  // Bonus/malus complétude des prix
  const pricedRate = input.totalPosts > 0 ? (input.pricedPosts / input.totalPosts) * 100 : 0
  if (pricedRate > 95) {
    priceScore = Math.min(100, priceScore + 10)
  } else if (pricedRate < 80) {
    priceScore = Math.max(0, priceScore - 20)
    flags.push('DOSSIER_INCOMPLET')
  }

  return { score: priceScore, flags }
}

// ─── CRITÈRE 2 — Documents ────────────────────────────────────────────────────

function scoreDocuments(input: ScoringCompanyInput): { score: number; flags: AlertFlag[] } {
  const flags: AlertFlag[] = []

  const mandatoryDocs = input.mandatoryDocTypes.length > 0 ? input.mandatoryDocTypes : MANDATORY_DOCS
  const providedMandatory = mandatoryDocs.filter((type) =>
    input.adminDocs.some((d) => d.type === type && (d.status === 'VALID' || d.status === 'PENDING'))
  )
  const missingMandatory = mandatoryDocs.length - providedMandatory.length

  if (missingMandatory >= 2) {
    flags.push('DOSSIER_INCOMPLET')
  }

  // Vérifier décennale expirée
  const decennale = input.adminDocs.find((d) => d.type === 'decennale')
  if (decennale && decennale.status === 'EXPIRED') {
    flags.push('DOCUMENT_INVALIDE')
  }

  let docScore: number
  if (missingMandatory === 0) docScore = 100
  else if (missingMandatory === 1) docScore = 40
  else docScore = 0

  // Bonus docs facultatifs (ici pas applicable car tous sont obligatoires, bonus si > 5 docs)
  const extraDocs = input.adminDocs.filter(
    (d) => !MANDATORY_DOCS.includes(d.type) && (d.status === 'VALID' || d.status === 'PENDING')
  ).length
  docScore = Math.min(100, docScore + Math.min(extraDocs, 2) * 10)

  return { score: docScore, flags }
}

// ─── CRITÈRE 3 — Fiabilité ────────────────────────────────────────────────────

function scoreReliability(input: ScoringCompanyInput): { score: number; flags: AlertFlag[] } {
  const flags: AlertFlag[] = []

  // Base score SIRET
  let reliabilityScore: number
  if (input.siretVerified) {
    reliabilityScore = 100
  } else {
    reliabilityScore = 40
  }

  // Pénalité si nom dirigeant data.gouv ≠ signataire enregistré
  if (input.directorNameMatch === false) {
    reliabilityScore = Math.max(0, reliabilityScore - 20)
    flags.push('DIRIGEANT_NOM_DIFFERENT')
  }

  // Bonus ancienneté
  if (input.agencyCreatedAt) {
    const ageMs = Date.now() - new Date(input.agencyCreatedAt).getTime()
    const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25)

    if (ageYears > 10) {
      reliabilityScore = Math.min(100, reliabilityScore + 15)
    } else if (ageYears >= 3) {
      reliabilityScore = Math.min(100, reliabilityScore + 5)
    } else if (ageYears < 1) {
      reliabilityScore = Math.max(0, reliabilityScore - 15)
      flags.push('ENTREPRISE_RECENTE')
    }
  }

  return { score: reliabilityScore, flags }
}

// ─── CRITÈRE 4 — Divergences ─────────────────────────────────────────────────

function scoreDivergences(input: ScoringCompanyInput): { score: number; flags: AlertFlag[] } {
  const flags: AlertFlag[] = []

  if (input.totalPosts === 0) return { score: 100, flags }

  const divergencePct = (input.divergences / input.totalPosts) * 100

  let divScore: number
  if (divergencePct === 0) divScore = 100
  else if (divergencePct < 5) divScore = 80
  else if (divergencePct < 15) divScore = 60
  else if (divergencePct < 25) divScore = 30
  else {
    divScore = 0
    flags.push('METRES_FORTEMENT_MODIFIES')
  }

  return { score: divScore, flags }
}

// ─── CRITÈRE 5 — Réactivité ──────────────────────────────────────────────────

function scoreReactivity(input: ScoringCompanyInput): { score: number; flags: AlertFlag[] } {
  const flags: AlertFlag[] = []

  if (!input.submittedAt) return { score: 0, flags }

  const invitedMs = new Date(input.invitedAt).getTime()
  const submittedMs = new Date(input.submittedAt).getTime()
  const delayDays = (submittedMs - invitedMs) / (1000 * 60 * 60 * 24)

  let reactScore: number
  if (delayDays < 3) reactScore = 100
  else if (delayDays < 7) reactScore = 80
  else if (delayDays < 14) reactScore = 60
  else reactScore = 40

  // Bonus Q&A
  if (input.hasAskedQuestion) {
    reactScore = Math.min(100, reactScore + 10)
  }

  return { score: reactScore, flags }
}

// ─── Fonction principale ──────────────────────────────────────────────────────

export function calculateScore(
  input: ScoringCompanyInput,
  weights: ScoringWeights
): ScoringResult {
  const allFlags: AlertFlag[] = []

  const { score: priceRaw, flags: priceFlags } = scorePrix(input)
  const { score: docRaw, flags: docFlags } = scoreDocuments(input)
  const { score: relRaw, flags: relFlags } = scoreReliability(input)
  const { score: divRaw, flags: divFlags } = scoreDivergences(input)
  const { score: reactRaw, flags: reactFlags } = scoreReactivity(input)

  allFlags.push(...priceFlags, ...docFlags, ...relFlags, ...divFlags, ...reactFlags)

  const priceWeighted = (priceRaw * weights.weightPrice) / 100
  const docWeighted = (docRaw * weights.weightDocuments) / 100
  const relWeighted = (relRaw * weights.weightReliability) / 100
  const divWeighted = (divRaw * weights.weightDivergences) / 100
  const reactWeighted = (reactRaw * weights.weightReactivity) / 100

  const globalScore = Math.round(priceWeighted + docWeighted + relWeighted + divWeighted + reactWeighted)

  let recommendation: Recommendation
  if (globalScore >= 75) recommendation = 'RECOMMANDEE'
  else if (globalScore >= 50) recommendation = 'A_ETUDIER'
  else recommendation = 'RISQUEE'

  // Details for display
  const ecartPct = input.total !== null && input.estimatifTotal && input.estimatifTotal > 0
    ? ((input.total - input.estimatifTotal) / input.estimatifTotal) * 100
    : null

  const pricedRate = input.totalPosts > 0 ? (input.pricedPosts / input.totalPosts) * 100 : 0

  const _mandatoryDocs = input.mandatoryDocTypes.length > 0 ? input.mandatoryDocTypes : MANDATORY_DOCS
  const mandatoryDocsMissing = _mandatoryDocs.filter(
    (type) => !input.adminDocs.some((d) => d.type === type && (d.status === 'VALID' || d.status === 'PENDING'))
  ).length

  const siretStatus = input.siretVerified ? 'VERIFIED' : 'UNVERIFIED'

  let agencyAgeYears: number | null = null
  if (input.agencyCreatedAt) {
    agencyAgeYears = (Date.now() - new Date(input.agencyCreatedAt).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  }

  const divergencePct = input.totalPosts > 0 ? (input.divergences / input.totalPosts) * 100 : 0

  let responseDelayDays: number | null = null
  if (input.submittedAt) {
    responseDelayDays = (new Date(input.submittedAt).getTime() - new Date(input.invitedAt).getTime()) / (1000 * 60 * 60 * 24)
  }

  return {
    companyId: input.id,
    companyName: input.name,
    globalScore,
    recommendation,
    flags: Array.from(new Set(allFlags)),
    criteria: {
      price: { rawScore: priceRaw, weightedScore: Math.round(priceWeighted), weight: weights.weightPrice },
      documents: { rawScore: docRaw, weightedScore: Math.round(docWeighted), weight: weights.weightDocuments },
      reliability: { rawScore: relRaw, weightedScore: Math.round(relWeighted), weight: weights.weightReliability },
      divergences: { rawScore: divRaw, weightedScore: Math.round(divWeighted), weight: weights.weightDivergences },
      reactivity: { rawScore: reactRaw, weightedScore: Math.round(reactWeighted), weight: weights.weightReactivity },
    },
    details: {
      priceEcartPct: ecartPct,
      pricedPostsRate: pricedRate,
      mandatoryDocsMissing,
      siretStatus,
      agencyAgeYears,
      divergencePct,
      responseDelayDays,
    },
  }
}
