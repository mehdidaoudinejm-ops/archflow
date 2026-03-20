'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { AlertTriangle, Download, Share2, Settings, ChevronDown, ChevronUp, RotateCcw, Save, Check, Trophy, Info, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { calculateScore, type ScoringWeights, type ScoringResult, DEFAULT_WEIGHTS } from '@/lib/scoring'
import { CompanySheet } from '@/components/dpgf/AOTracker'

// ── Types ─────────────────────────────────────────────────────────────────────

interface OfferPostData {
  unitPrice: number | null
  qtyCompany: number | null
  qtyMotive: string | null
}

interface Post {
  id: string
  ref: string
  title: string
  unit: string
  qtyArchi: number | null
  unitPriceArchi: number | null
  totalArchi: number | null
  minPrice: number | null
  maxPrice: number | null
  minCompanyId: string | null
  maxCompanyId: string | null
  hasQtyDivergence: boolean
}

interface Lot {
  id: string
  number: number
  name: string
  totalArchi: number | null
  posts: Post[]
}

interface CompanyData {
  id: string
  name: string
  total: number | null
  offerPosts: Record<string, OfferPostData>
  submittedAt: string | null
  invitedAt: string
  adminDocs: { id: string; type: string; status: string; fileUrl: string; rejectionReason: string | null; expiresAt: string | null }[]
  siretVerified: boolean
  agencyCreatedAt: string | null
  divergences: number
  totalPosts: number
  pricedPosts: number
  hasAskedQuestion: boolean
  directorNameMatch: boolean | null
  legalFormMatch: boolean | null
  legalFormInsee: string | null
}

interface AnalysisData {
  ao: {
    id: string
    name: string
    deadline: string
    status: string
    clientPublished: boolean
    publishedElements: Record<string, unknown>
    mandatoryDocTypes: string[]
  }
  project: { id: string; name: string }
  companies: CompanyData[]
  lots: Lot[]
  totals: { estimatif: number | null; min: number | null; max: number | null; ecart: number | null }
  divergenceCount: number
  scoringConfig: ScoringWeights
  vatRate: number
}

interface Props {
  projectId: string
  projectName: string
  agencyName: string
  initialData: AnalysisData
  readOnly?: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(v: number | null): string {
  if (v == null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}

function pct(val: number | null, ref: number | null): string {
  if (val == null || ref == null || ref === 0) return ''
  const p = ((val - ref) / ref) * 100
  return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`
}

const COMPANY_COLORS = ['#2D7A50', '#B45309', '#1d4ed8', '#7c3aed', '#be123c', '#0891b2']

const FLAG_LABELS: Record<string, string> = {
  OFFRE_ANORMALEMENT_BASSE: '⚠ Offre anormalement basse',
  DOSSIER_INCOMPLET: '⚠ Dossier incomplet',
  DOCUMENT_INVALIDE: '⚠ Document invalide (décennale expirée)',
  ENTREPRISE_INACTIVE: '⚠ Entreprise inactive',
  ENTREPRISE_RECENTE: '⚠ Entreprise récente (< 1 an)',
  METRES_FORTEMENT_MODIFIES: '⚠ Métrés fortement modifiés',
  DIRIGEANT_NOM_DIFFERENT: '⚠ Dirigeant différent (data.gouv)',
  FORME_JURIDIQUE_DIFFERENTE: '⚠ Forme juridique différente (INSEE)',
}

const CRITERIA_LABELS = [
  { key: 'price', label: 'Compétitivité prix', weightKey: 'weightPrice' },
  { key: 'documents', label: 'Complétude documents', weightKey: 'weightDocuments' },
  { key: 'reliability', label: 'Fiabilité entreprise', weightKey: 'weightReliability' },
  { key: 'divergences', label: 'Divergences métrés', weightKey: 'weightDivergences' },
  { key: 'reactivity', label: 'Réactivité & engagement', weightKey: 'weightReactivity' },
] as const

// ── Score color ───────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 75) return '#1A5C3A'
  if (score >= 50) return '#B45309'
  return '#9B1C1C'
}

function scoreBg(score: number): string {
  if (score >= 75) return '#EAF3ED'
  if (score >= 50) return '#FEF3E2'
  return '#FEE8E8'
}

function recommendationLabel(rec: string): { label: string; color: string; bg: string } {
  if (rec === 'RECOMMANDEE') return { label: 'Recommandée', color: '#1A5C3A', bg: '#EAF3ED' }
  if (rec === 'A_ETUDIER') return { label: 'À étudier', color: '#B45309', bg: '#FEF3E2' }
  return { label: 'Risquée', color: '#9B1C1C', bg: '#FEE8E8' }
}

// ── Scoring weights panel ─────────────────────────────────────────────────────

function WeightsPanel({
  aoId,
  weights,
  onWeightsChange,
}: {
  aoId: string
  weights: ScoringWeights
  onWeightsChange: (w: ScoringWeights) => void
}) {
  const [open, setOpen] = useState(false)
  const [local, setLocal] = useState<ScoringWeights>(weights)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const sum = local.weightPrice + local.weightDocuments + local.weightReliability + local.weightDivergences + local.weightReactivity
  const isValid = sum === 100

  function handleSlider(key: keyof ScoringWeights, value: number) {
    const next = { ...local, [key]: value }
    setLocal(next)
    setSaved(false)
    // Recalcul temps réel même si somme ≠ 100
    onWeightsChange(next)
  }

  function autoBalance() {
    const keys: (keyof ScoringWeights)[] = ['weightPrice', 'weightDocuments', 'weightReliability', 'weightDivergences', 'weightReactivity']
    const diff = 100 - sum
    const newLocal = { ...local }
    let maxKey = keys[0]
    for (const k of keys) if (newLocal[k] > newLocal[maxKey]) maxKey = k
    newLocal[maxKey] = Math.max(0, newLocal[maxKey] + diff)
    setLocal(newLocal)
    onWeightsChange(newLocal)
  }

  function reset() {
    setLocal(DEFAULT_WEIGHTS)
    setSaved(false)
    onWeightsChange(DEFAULT_WEIGHTS)
  }

  async function save() {
    if (!isValid) return
    setSaving(true)
    try {
      await fetch(`/api/ao/${aoId}/scoring-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(local),
      })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E8E8E3', marginBottom: 24 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings size={15} style={{ color: '#6B6B65' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A18' }}>Configurer les critères d&apos;analyse</span>
        </div>
        {open ? <ChevronUp size={15} style={{ color: '#9B9B94' }} /> : <ChevronDown size={15} style={{ color: '#9B9B94' }} />}
      </button>

      {open && (
        <div style={{ borderTop: '1px solid #F0F0EB', padding: '20px 24px' }}>
          <div style={{ display: 'grid', gap: 18, marginBottom: 20 }}>
            {CRITERIA_LABELS.map(({ key, label, weightKey }) => (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#4B4B45', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1A5C3A', minWidth: 36, textAlign: 'right' }}>
                    {local[weightKey]}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={local[weightKey]}
                  onChange={(e) => handleSlider(weightKey, parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#1A5C3A' }}
                />
              </div>
            ))}
          </div>

          {/* Sum indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderRadius: 8,
            background: isValid ? '#EAF3ED' : '#FEF3E2',
            border: `1px solid ${isValid ? '#2D7A50' : '#B45309'}`,
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 13, color: isValid ? '#1A5C3A' : '#B45309', fontWeight: 500 }}>
              Total : {sum}%{!isValid && ' — doit être égal à 100%'}
            </span>
            {!isValid && (
              <button
                onClick={autoBalance}
                style={{ fontSize: 12, color: '#B45309', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                Équilibrer
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={reset}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                borderRadius: 8, border: '1px solid #E0E0DA', background: 'transparent',
                color: '#6B6B65', fontSize: 13, cursor: 'pointer',
              }}
            >
              <RotateCcw size={13} /> Réinitialiser
            </button>
            <button
              onClick={() => void save()}
              disabled={!isValid || saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                borderRadius: 8, border: 'none',
                background: !isValid ? '#D4D4CC' : '#1F6B44',
                color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: !isValid ? 'not-allowed' : 'pointer',
              }}
            >
              {saved ? <Check size={13} /> : <Save size={13} />}
              {saving ? 'Enregistrement...' : saved ? 'Enregistré !' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Company ranking card ──────────────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<string, string> = {
  kbis: 'Kbis',
  decennale: 'Décennale',
  rcpro: 'RC Pro',
  rib: 'RIB',
  urssaf: 'Attestation URSSAF',
}

const DOC_STATUS_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:  { label: 'En attente', bg: '#FEF3E2', color: '#B45309' },
  VALID:    { label: 'Valide',     bg: '#EAF3ED', color: '#1A5C3A' },
  REJECTED: { label: 'Rejeté',    bg: '#FEE8E8', color: '#9B1C1C' },
  EXPIRED:  { label: 'Expiré',    bg: '#FEE8E8', color: '#9B1C1C' },
}

function AdminDocRow({
  doc,
  aoId,
  companyId,
  onUpdate,
}: {
  doc: CompanyData['adminDocs'][number]
  aoId: string
  companyId: string
  onUpdate: (docId: string, status: string, rejectionReason: string | null) => void
}) {
  const [saving, setSaving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState(doc.rejectionReason ?? '')
  const [opening, setOpening] = useState(false)

  const style = DOC_STATUS_STYLES[doc.status] ?? DOC_STATUS_STYLES.PENDING

  async function openDoc() {
    setOpening(true)
    try {
      const res = await fetch(`/api/ao/${aoId}/companies/${companyId}/admin-docs/${doc.id}/signed-url`)
      const data = await res.json() as { url?: string; error?: string }
      if (data.url) window.open(data.url, '_blank', 'noopener')
    } finally {
      setOpening(false)
    }
  }

  async function patch(status: string, rejectionReason?: string) {
    setSaving(true)
    try {
      const res = await fetch(`/api/ao/${aoId}/companies/${companyId}/admin-docs/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectionReason }),
      })
      if (res.ok) {
        onUpdate(doc.id, status, rejectionReason ?? null)
        setRejecting(false)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F0F0EB' }}>
      <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#4B4B45' }}>
        {DOC_TYPE_LABELS[doc.type] ?? doc.type}
      </div>
      <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, fontWeight: 500, background: style.bg, color: style.color }}>
        {style.label}
      </span>
      {doc.fileUrl && (
        <button
          onClick={() => void openDoc()}
          disabled={opening}
          style={{ fontSize: 11, color: '#1A5C3A', padding: '3px 8px', borderRadius: 6, border: '1px solid #C8E0D4', background: '#F4FAF6', cursor: opening ? 'wait' : 'pointer', opacity: opening ? 0.6 : 1 }}
        >
          {opening ? '...' : 'Voir ↗'}
        </button>
      )}
      {doc.status !== 'VALID' && (
        <button
          onClick={() => void patch('VALID')}
          disabled={saving}
          style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #C8E0D4', background: '#EAF3ED', color: '#1A5C3A', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}
        >
          ✓ Valider
        </button>
      )}
      {doc.status !== 'REJECTED' && !rejecting && (
        <button
          onClick={() => setRejecting(true)}
          disabled={saving}
          style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #F0C8C8', background: '#FEE8E8', color: '#9B1C1C', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}
        >
          ✗ Rejeter
        </button>
      )}
      {rejecting && (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motif (optionnel)"
            style={{ fontSize: 11, padding: '3px 6px', borderRadius: 4, border: '1px solid #E8E8E3', width: 140 }}
          />
          <button
            onClick={() => void patch('REJECTED', reason || undefined)}
            disabled={saving}
            style={{ fontSize: 11, padding: '3px 7px', borderRadius: 4, background: '#9B1C1C', color: '#fff', border: 'none', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}
          >
            {saving ? '…' : 'OK'}
          </button>
          <button
            onClick={() => setRejecting(false)}
            style={{ fontSize: 11, padding: '3px 7px', borderRadius: 4, background: '#F0F0EB', color: '#6B6B65', border: 'none', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

function CompanyCard({
  rank,
  result,
  company: initialCompany,
  estimatif,
  fmt,
  isAwarded,
  aoId,
  readOnly = false,
  onOpenSheet,
}: {
  rank: number
  result: ScoringResult
  company: CompanyData
  estimatif: number | null
  fmt: (v: number | null) => string
  isAwarded?: boolean
  aoId: string
  readOnly?: boolean
  onOpenSheet?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [company, setCompany] = useState(initialCompany)

  function handleDocUpdate(docId: string, status: string, rejectionReason: string | null) {
    setCompany((prev) => ({
      ...prev,
      adminDocs: prev.adminDocs.map((d) => d.id === docId ? { ...d, status, rejectionReason } : d),
    }))
  }
  const rec = recommendationLabel(result.recommendation)

  const rankStyle: Record<number, { bg: string; color: string; label: string }> = {
    1: { bg: '#FEF3E2', color: '#B45309', label: '🥇' },
    2: { bg: '#F3F3F0', color: '#6B6B65', label: '🥈' },
    3: { bg: '#FEF3E2', color: '#9B6A2A', label: '🥉' },
  }
  const rankStyle_ = rankStyle[rank] ?? { bg: '#F8F8F6', color: '#9B9B94', label: `${rank}` }

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E8E8E3', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          {/* Rank */}
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: rankStyle_.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: rank <= 3 ? 18 : 13, fontWeight: 700, color: rankStyle_.color,
          }}>
            {rankStyle_.label}
          </div>

          {/* Company info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A18' }}>{result.companyName}</span>
              {isAwarded && (
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#FEF3E2', color: '#B45309', fontWeight: 700 }}>
                  🏆 Marché attribué
                </span>
              )}
              {company.siretVerified ? (
                <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: '#EAF3ED', color: '#1A5C3A', fontWeight: 500 }}>
                  ✓ SIRET vérifié
                </span>
              ) : (
                <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: '#FEF3E2', color: '#B45309', fontWeight: 500 }}>
                  SIRET non vérifié
                </span>
              )}
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: rec.bg, color: rec.color, fontWeight: 600 }}>
                {rec.label}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#6B6B65' }}>
              {fmt(company.total)}
              {estimatif && company.total && (
                <span style={{ marginLeft: 8, color: company.total > estimatif ? '#9B1C1C' : '#1A5C3A', fontWeight: 500 }}>
                  {pct(company.total, estimatif)}
                </span>
              )}
            </div>
          </div>

          {/* Global score */}
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: scoreBg(result.globalScore),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 800, color: scoreColor(result.globalScore),
            }}>
              {result.globalScore}
            </div>
            <div style={{ fontSize: 10, color: '#9B9B94', marginTop: 3 }}>/100</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 12, height: 6, borderRadius: 3, background: '#F0F0EB', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3,
            width: `${result.globalScore}%`,
            background: scoreColor(result.globalScore),
            transition: 'width 0.4s ease',
          }} />
        </div>

        {/* Mini criteria bars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginTop: 12 }}>
          {CRITERIA_LABELS.map(({ key, label }) => {
            const crit = result.criteria[key as keyof typeof result.criteria]
            return (
              <div key={key} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#9B9B94', marginBottom: 3, lineHeight: 1.2 }}>
                  {label.split(' ')[0]}
                </div>
                <div style={{ height: 3, borderRadius: 2, background: '#F0F0EB', overflow: 'hidden', marginBottom: 3 }}>
                  <div style={{ height: '100%', width: `${crit.rawScore}%`, background: scoreColor(crit.rawScore) }} />
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: scoreColor(crit.rawScore) }}>
                  {crit.rawScore}
                </div>
              </div>
            )
          })}
        </div>

        {/* Flags */}
        {result.flags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {result.flags.map((flag) => (
              <span key={flag} style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 6,
                background: '#FEE8E8', color: '#9B1C1C', fontWeight: 500,
              }}>
                {FLAG_LABELS[flag] ?? flag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              fontSize: 12, color: '#6B6B65',
              background: 'none', border: '1px solid #E0E0DA',
              borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Masquer le détail' : 'Voir le détail'}
          </button>
          {!readOnly && onOpenSheet && (
            <button
              onClick={onOpenSheet}
              style={{
                fontSize: 12, color: '#1A5C3A',
                background: '#EAF3ED', border: '1px solid #A7D4B8',
                borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <FileText size={12} />
              Fiche entreprise
            </button>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: '1px solid #F0F0EB', padding: '16px 22px', background: '#F8F8F6' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {CRITERIA_LABELS.map(({ key, label }) => {
              const crit = result.criteria[key as keyof typeof result.criteria]
              return (
                <div key={key} style={{ background: '#fff', borderRadius: 8, padding: '12px 14px', border: '1px solid #E8E8E3' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#4B4B45' }}>{label}</span>
                    <span style={{ fontSize: 11, color: '#9B9B94' }}>poids {crit.weight}%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#F0F0EB', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${crit.rawScore}%`, background: scoreColor(crit.rawScore) }} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor(crit.rawScore), minWidth: 28, textAlign: 'right' }}>
                      {crit.rawScore}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#9B9B94', marginTop: 4 }}>
                    Contribution : +{crit.weightedScore} pts
                  </div>
                </div>
              )
            })}
          </div>

          {/* Details */}
          <div style={{ marginTop: 12, fontSize: 12, color: '#6B6B65', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
            {result.details.priceEcartPct !== null && (
              <div>Écart vs estimatif : <strong>{result.details.priceEcartPct >= 0 ? '+' : ''}{result.details.priceEcartPct.toFixed(1)}%</strong></div>
            )}
            <div>Postes chiffrés : <strong>{result.details.pricedPostsRate.toFixed(0)}%</strong></div>
            <div>Docs obligatoires manquants : <strong>{result.details.mandatoryDocsMissing}</strong></div>
            <div>Divergences métrés : <strong>{result.details.divergencePct.toFixed(0)}%</strong></div>
            {result.details.responseDelayDays !== null && (
              <div>Délai de réponse : <strong>{Math.round(result.details.responseDelayDays)} jours</strong></div>
            )}
            {result.details.agencyAgeYears !== null && (
              <div>Ancienneté : <strong>{result.details.agencyAgeYears.toFixed(1)} ans</strong></div>
            )}
          </div>

          {/* Documents admin */}
          {!readOnly && company.adminDocs.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#4B4B45', marginBottom: 6 }}>
                Documents administratifs
              </div>
              <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #E8E8E3', padding: '4px 12px' }}>
                {company.adminDocs.map((doc) => (
                  <AdminDocRow
                    key={doc.id}
                    doc={doc}
                    aoId={aoId}
                    companyId={company.id}
                    onUpdate={handleDocUpdate}
                  />
                ))}
              </div>
            </div>
          )}
          {readOnly && company.adminDocs.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 12, color: '#6B6B65' }}>
              {company.adminDocs.filter((d) => d.status === 'VALID').length}/{company.adminDocs.length} documents administratifs validés
            </div>
          )}
          {company.adminDocs.length === 0 && (
            <div style={{ marginTop: 12, fontSize: 12, color: '#9B9B94' }}>
              Aucun document administratif déposé.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function AnalysisPageClient({ projectId, projectName, agencyName, initialData, readOnly = false }: Props) {
  const { ao, companies, lots, totals, divergenceCount } = initialData
  const vatRate = initialData.vatRate ?? 20

  const [weights, setWeights] = useState<ScoringWeights>(initialData.scoringConfig)
  const [selectedLotId, setSelectedLotId] = useState<string>('all')
  const [sortByCompanyId, setSortByCompanyId] = useState<string | null>(null)
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>(() => {
    const pe = ao.publishedElements
    return Array.isArray(pe?.selectedCompanyIds) ? (pe.selectedCompanyIds as string[]) : []
  })
  const [companyNotes, setCompanyNotes] = useState<Record<string, string>>(() => {
    const pe = ao.publishedElements
    return (pe?.companyNotes ?? {}) as Record<string, string>
  })
  const [sheetCompanyId, setSheetCompanyId] = useState<string | null>(null)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [publishElements, setPublishElements] = useState(() => {
    const pe = ao.publishedElements as Record<string, boolean> | null
    return {
      companies: pe?.companies ?? true,
      offers: pe?.offers ?? true,
      progress: pe?.progress ?? true,
      analysis: pe?.analysis ?? false,
      ranking: pe?.ranking ?? true,
      tableau: pe?.tableau ?? false,
      graphiques: pe?.graphiques ?? false,
      full_analysis: pe?.full_analysis ?? false,
    }
  })
  const [publishing, setPublishing] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  // TVA toggle
  const [showTTC, setShowTTC] = useState(false)
  const vatMultiplier = showTTC ? (1 + vatRate / 100) : 1
  function fmt(v: number | null): string {
    if (v == null) return '—'
    return formatPrice(v * vatMultiplier)
  }

  // AO lifecycle
  const [aoStatus, setAoStatus] = useState(ao.status)
  const [awardedCompanyId, setAwardedCompanyId] = useState<string | null>(
    (ao.publishedElements?.awardedCompanyId as string | null) ?? null
  )
  const [awardModalOpen, setAwardModalOpen] = useState(false)
  const [awardingCompanyId, setAwardingCompanyId] = useState<string | null>(null)
  const [awarding, setAwarding] = useState(false)
  const [transitioning, setTransitioning] = useState(false)

  async function handleAdvanceStatus(status: 'ANALYSED' | 'AWARDED', awardedId?: string) {
    setTransitioning(true)
    try {
      const res = await fetch(`/api/ao/${ao.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(status === 'AWARDED' ? { status, awardedCompanyId: awardedId } : { status }),
      })
      if (res.ok) {
        setAoStatus(status)
        if (status === 'AWARDED' && awardedId) setAwardedCompanyId(awardedId)
      }
    } finally {
      setTransitioning(false)
    }
  }

  async function handleAward() {
    if (!awardingCompanyId) return
    setAwarding(true)
    await handleAdvanceStatus('AWARDED', awardingCompanyId)
    setAwarding(false)
    setAwardModalOpen(false)
  }

  // Compute scores with current weights (recalculates on slider change)
  const scoringResults = useMemo(() => {
    return companies.map((c) =>
      calculateScore(
        {
          id: c.id,
          name: c.name,
          total: c.total,
          estimatifTotal: totals.estimatif,
          totalPosts: c.totalPosts,
          pricedPosts: c.pricedPosts,
          adminDocs: c.adminDocs,
          mandatoryDocTypes: initialData.ao.mandatoryDocTypes,
          siretVerified: c.siretVerified,
          agencyCreatedAt: c.agencyCreatedAt,
          divergences: c.divergences,
          submittedAt: c.submittedAt,
          invitedAt: c.invitedAt,
          hasAskedQuestion: c.hasAskedQuestion,
          directorNameMatch: c.directorNameMatch,
          legalFormMatch: c.legalFormMatch,
        },
        weights
      )
    )
  }, [companies, weights, totals.estimatif])

  const rankedResults = useMemo(
    () => [...scoringResults].sort((a, b) => b.globalScore - a.globalScore),
    [scoringResults]
  )

  const scoreMap = useMemo(
    () => new Map(scoringResults.map((r) => [r.companyId, r])),
    [scoringResults]
  )

  // Table data
  const visiblePosts = useMemo(() => {
    return selectedLotId === 'all'
      ? lots.flatMap((l) => l.posts.map((p) => ({ ...p, lotName: l.name, lotNumber: l.number })))
      : (lots.find((l) => l.id === selectedLotId)?.posts ?? []).map((p) => {
          const lot = lots.find((l) => l.id === selectedLotId)!
          return { ...p, lotName: lot.name, lotNumber: lot.number }
        })
  }, [lots, selectedLotId])

  const sortedPosts = useMemo(() => {
    if (!sortByCompanyId) return visiblePosts
    return [...visiblePosts].sort((a, b) => {
      const getTotal = (post: Post) => {
        const op = companies.find((c) => c.id === sortByCompanyId)?.offerPosts[post.id]
        if (!op) return Infinity
        const qty = op.qtyCompany ?? post.qtyArchi
        return qty != null && op.unitPrice != null ? qty * op.unitPrice : Infinity
      }
      return getTotal(a) - getTotal(b)
    })
  }, [visiblePosts, sortByCompanyId, companies])

  const chartData = lots.map((lot) => {
    const row: Record<string, unknown> = { name: `Lot ${lot.number}`, estimatif: lot.totalArchi ?? 0 }
    companies.forEach((c) => {
      let total = 0
      for (const post of lot.posts) {
        const op = c.offerPosts[post.id]
        if (!op) continue
        const qty = op.qtyCompany ?? post.qtyArchi
        if (qty != null && op.unitPrice != null) total += qty * op.unitPrice
      }
      row[c.id] = total
    })
    return row
  })

  function toggleSelect(id: string) {
    setSelectedCompanyIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  async function handlePublish() {
    setPublishing(true)
    try {
      await fetch(`/api/client/${projectId}/consultation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aoId: ao.id,
          clientPublished: true,
          publishedElements: { ...publishElements, selectedCompanyIds, companyNotes },
        }),
      })
      setPublishSuccess(true)
      setPublishDialogOpen(false)
    } finally {
      setPublishing(false)
    }
  }

  async function handleDownloadPdf() {
    setDownloadingPdf(true)
    try {
      const res = await fetch(`/api/ao/${ao.id}/report`)
      if (!res.ok) throw new Error('Erreur PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analyse-${ao.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloadingPdf(false)
    }
  }

  // agencyName used for future PDF header — kept in props
  void agencyName
  // scoreMap used for selection section
  void scoreMap

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm" style={{ color: 'var(--text3)' }}>{projectName}</p>
          <h1 className="text-2xl font-semibold mt-0.5" style={{ fontFamily: 'var(--font-dm-serif)', color: 'var(--text)' }}>
            Analyse des offres
          </h1>
        </div>
        {!readOnly && (
          <div className="flex gap-2 mt-1">
            <Button variant="outline" onClick={handleDownloadPdf} disabled={downloadingPdf} className="h-9 text-sm">
              <Download size={14} className="mr-1.5" />
              {downloadingPdf ? 'Génération...' : 'Rapport PDF'}
            </Button>
            <Button
              onClick={() => setPublishDialogOpen(true)}
              className="h-9 text-sm"
              style={{ background: 'var(--green-btn)', color: '#fff', border: 'none' }}
            >
              <Share2 size={14} className="mr-1.5" />
              {publishSuccess || ao.clientPublished ? 'Republier au client' : 'Publier au client'}
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      {!readOnly && <div className="flex gap-0" style={{ borderBottom: '2px solid var(--border)' }}>
        {[
          { label: 'Infos', href: `/dpgf/${projectId}/settings`, active: false },
          { label: "DQE", href: `/dpgf/${projectId}`, active: false },
          { label: 'DCE', href: `/dpgf/${projectId}/dce`, active: false },
          { label: 'Q&A', href: `/dpgf/${projectId}/qa`, active: false },
          { label: 'Analyse', href: `/dpgf/${projectId}/analyse`, active: true },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="px-4 py-2 text-sm font-medium transition-colors"
            style={{
              color: tab.active ? 'var(--green)' : 'var(--text2)',
              borderBottom: tab.active ? '2px solid var(--green)' : '2px solid transparent',
              marginBottom: '-2px',
            }}
          >
            {tab.label}
          </Link>
        ))}
      </div>}

      {/* AO Lifecycle panel */}
      {['CLOSED', 'ANALYSED', 'AWARDED'].includes(aoStatus) && (
        <div className="flex items-center justify-between px-5 py-3.5 rounded-[var(--radius-lg)]"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center gap-3">
            {[
              { key: 'CLOSED', label: 'Clôturé' },
              { key: 'ANALYSED', label: 'Analysé' },
              { key: 'AWARDED', label: 'Attribué' },
            ].map((step, i, arr) => {
              const order = ['CLOSED', 'ANALYSED', 'AWARDED']
              const currentIdx = order.indexOf(aoStatus)
              const stepIdx = order.indexOf(step.key)
              const isDone = stepIdx <= currentIdx
              const isActive = step.key === aoStatus
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: isDone ? 'var(--green)' : 'var(--surface2)',
                      border: `2px solid ${isDone ? 'var(--green)' : 'var(--border2)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isDone && step.key === 'AWARDED'
                        ? <Trophy size={10} color="#fff" />
                        : isDone ? <Check size={10} color="#fff" /> : null}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, color: isDone ? 'var(--green)' : 'var(--text3)' }}>
                      {step.label}
                    </span>
                    {step.key === 'AWARDED' && awardedCompanyId && (
                      <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 500 }}>
                        — {companies.find((c) => c.id === awardedCompanyId)?.name ?? ''}
                      </span>
                    )}
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ width: 20, height: 2, background: stepIdx < currentIdx ? 'var(--green)' : 'var(--border2)', flexShrink: 0 }} />
                  )}
                </div>
              )
            })}
          </div>
          {!readOnly && (
            <div>
              {aoStatus === 'CLOSED' && (
                <button
                  onClick={() => void handleAdvanceStatus('ANALYSED')}
                  disabled={transitioning}
                  style={{ padding: '6px 14px', borderRadius: 8, background: 'var(--green-btn)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: transitioning ? 'not-allowed' : 'pointer', opacity: transitioning ? 0.6 : 1 }}
                >
                  {transitioning ? '...' : 'Marquer comme analysé'}
                </button>
              )}
              {aoStatus === 'ANALYSED' && (
                <button
                  onClick={() => setAwardModalOpen(true)}
                  style={{ padding: '6px 14px', borderRadius: 8, background: '#B45309', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Attribuer le marché
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION 1 — Weights config */}
      {!readOnly && <WeightsPanel aoId={ao.id} weights={weights} onWeightsChange={setWeights} />}

      {/* Divergences banner */}
      {divergenceCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-[var(--radius)]"
          style={{ background: 'var(--amber-light)', border: '1px solid var(--amber)' }}>
          <AlertTriangle size={15} style={{ color: 'var(--amber)', flexShrink: 0 }} />
          <span className="text-sm" style={{ color: 'var(--amber)' }}>
            <strong>{divergenceCount}</strong> poste{divergenceCount > 1 ? 's' : ''} avec des métrés divergents
          </span>
        </div>
      )}

      {/* TVA toggle + Stats */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-medium" style={{ color: 'var(--text3)' }}>Synthèse des totaux</h2>
        <div className="flex items-center gap-1.5">
          <Info size={12} style={{ color: 'var(--text3)' }} />
          <span className="text-xs" style={{ color: 'var(--text3)' }}>Afficher :</span>
          {(['HT', 'TTC'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setShowTTC(mode === 'TTC')}
              className="px-2.5 py-1 rounded-[var(--radius)] text-xs font-medium"
              style={{
                background: (mode === 'TTC') === showTTC ? 'var(--green-light)' : 'var(--surface2)',
                color: (mode === 'TTC') === showTTC ? 'var(--green)' : 'var(--text3)',
                border: `1px solid ${(mode === 'TTC') === showTTC ? 'var(--green)' : 'var(--border)'}`,
              }}
            >
              {mode}
            </button>
          ))}
          {showTTC && (
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--amber-light)', color: 'var(--amber)' }}>
              TVA {vatRate}% incluse
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: `Estimatif archi ${showTTC ? 'TTC' : 'HT'}`, value: fmt(totals.estimatif), color: 'var(--text)' },
          { label: `Offre la + basse ${showTTC ? 'TTC' : 'HT'}`, value: fmt(totals.min), sub: pct(totals.min, totals.estimatif), color: 'var(--green)' },
          { label: `Offre la + haute ${showTTC ? 'TTC' : 'HT'}`, value: fmt(totals.max), sub: pct(totals.max, totals.estimatif), color: 'var(--amber)' },
          { label: 'Écart min / max', value: fmt(totals.ecart), color: 'var(--text)' },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-[var(--radius-lg)]"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text3)' }}>{stat.label}</p>
            <p className="text-xl font-semibold tabular-nums" style={{ color: stat.color }}>{stat.value}</p>
            {stat.sub && <p className="text-xs mt-0.5" style={{ color: stat.color, opacity: 0.75 }}>{stat.sub}</p>}
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="p-5 rounded-[var(--radius-lg)]"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Comparaison par lot</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} barGap={3} barCategoryGap="25%">
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text2)' }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 10, fill: 'var(--text3)' }}
              axisLine={false} tickLine={false} width={40}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [
                typeof value === 'number' ? formatPrice(value) : String(value ?? ''),
                name === 'estimatif' ? 'Estimatif' : (companies.find((c) => c.id === name)?.name ?? name),
              ]}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend
              formatter={(value) => value === 'estimatif' ? 'Estimatif' : (companies.find((c) => c.id === value)?.name ?? value)}
              wrapperStyle={{ fontSize: 11 }}
            />
            <Bar dataKey="estimatif" fill="var(--text3)" radius={[3, 3, 0, 0]} />
            {companies.map((c, i) => (
              <Bar key={c.id} dataKey={c.id} fill={COMPANY_COLORS[i % COMPANY_COLORS.length]} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* SECTION 2 — Classement */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
          Classement des entreprises
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rankedResults.map((result, idx) => {
            const company = companies.find((c) => c.id === result.companyId)!
            return (
              <CompanyCard
                key={result.companyId}
                rank={idx + 1}
                result={result}
                company={company}
                estimatif={totals.estimatif}
                fmt={fmt}
                aoId={ao.id}
                isAwarded={awardedCompanyId === result.companyId}
                readOnly={readOnly}
                onOpenSheet={() => setSheetCompanyId(result.companyId)}
              />
            )
          })}
        </div>
      </div>

      {/* SECTION 3 — Comparison table */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
          Tableau comparatif détaillé
        </h2>

        {/* Lot filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[{ id: 'all', label: 'Tous les lots' }, ...lots.map((l) => ({ id: l.id, label: `Lot ${l.number} — ${l.name}` }))].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedLotId(item.id)}
              className="px-3 py-1.5 rounded-[var(--radius)] text-sm transition-colors"
              style={{
                background: selectedLotId === item.id ? 'var(--green-light)' : 'var(--surface)',
                color: selectedLotId === item.id ? 'var(--green)' : 'var(--text2)',
                border: `1px solid ${selectedLotId === item.id ? 'var(--green)' : 'var(--border)'}`,
                fontWeight: selectedLotId === item.id ? 500 : 400,
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Score summary rows */}
        <div className="rounded-[var(--radius-lg)] overflow-hidden mb-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <table className="w-full text-sm" style={{ minWidth: 400 + companies.length * 150 }}>
            <thead>
              <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                <th className="text-left px-4 py-2.5 font-medium text-xs" style={{ color: 'var(--text2)', width: 220 }}>Critère</th>
                {rankedResults.map((r) => (
                  <th key={r.companyId} className="text-center px-3 py-2.5 font-medium text-xs" style={{ color: 'var(--text2)', width: 150 }}>
                    {r.companyName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Price row */}
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--text2)' }}>Prix total</td>
                {rankedResults.map((r) => {
                  const c = companies.find((x) => x.id === r.companyId)!
                  const best = companies.reduce((min, x) => (x.total !== null && (min === null || x.total < min) ? x.total : min), null as number | null)
                  const worst = companies.reduce((max, x) => (x.total !== null && (max === null || x.total > max) ? x.total : max), null as number | null)
                  return (
                    <td key={r.companyId} className="px-3 py-2.5 text-center tabular-nums text-xs"
                      style={{
                        background: c.total === best && best !== null ? 'rgba(26,92,58,0.06)' : c.total === worst && worst !== best ? 'rgba(155,28,28,0.06)' : undefined,
                      }}>
                      <div style={{ fontWeight: 600 }}>{fmt(c.total)}</div>
                      {totals.estimatif && c.total && (
                        <div style={{ color: c.total > totals.estimatif ? '#9B1C1C' : '#1A5C3A', fontSize: 11 }}>
                          {pct(c.total, totals.estimatif)}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
              {/* Score rows per criterion */}
              {CRITERIA_LABELS.map(({ key, label }) => {
                const scores = rankedResults.map((r) => r.criteria[key as keyof typeof r.criteria].rawScore)
                const maxScore = Math.max(...scores)
                const minScore = Math.min(...scores)
                return (
                  <tr key={key} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text2)' }}>
                      Score {label.toLowerCase()}
                    </td>
                    {rankedResults.map((r) => {
                      const s = r.criteria[key as keyof typeof r.criteria].rawScore
                      return (
                        <td key={r.companyId} className="px-3 py-2.5 text-center"
                          style={{
                            background: s === maxScore && scores.filter((x) => x === maxScore).length < scores.length
                              ? 'rgba(26,92,58,0.06)'
                              : s === minScore && scores.filter((x) => x === minScore).length < scores.length
                              ? 'rgba(155,28,28,0.06)'
                              : undefined,
                          }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: scoreColor(s) }}>{s}</span>
                          <span style={{ fontSize: 11, color: '#9B9B94' }}>/100</span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {/* SIRET row */}
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--text2)' }}>SIRET</td>
                {rankedResults.map((r) => {
                  const c = companies.find((x) => x.id === r.companyId)!
                  return (
                    <td key={r.companyId} className="px-3 py-2.5 text-center">
                      {c.siretVerified ? (
                        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: '#EAF3ED', color: '#1A5C3A', fontWeight: 500 }}>
                          ✓ Vérifié
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: '#FEF3E2', color: '#B45309', fontWeight: 500 }}>
                          Non vérifié
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
              {/* Global score row */}
              <tr style={{ background: '#F8F8F6' }}>
                <td className="px-4 py-3 font-semibold text-xs" style={{ color: 'var(--text)' }}>SCORE GLOBAL</td>
                {rankedResults.map((r) => {
                  const rec = recommendationLabel(r.recommendation)
                  return (
                    <td key={r.companyId} className="px-3 py-3 text-center">
                      <div style={{ fontSize: 20, fontWeight: 800, color: scoreColor(r.globalScore) }}>{r.globalScore}</div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: rec.color, marginTop: 2 }}>{rec.label}</div>
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Detailed posts table */}
        <div className="rounded-[var(--radius-lg)] overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="w-full text-sm" style={{ minWidth: 600 + companies.length * 130 }}>
              <thead>
                <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left px-3 py-2.5 font-medium text-xs" style={{ color: 'var(--text2)', width: 60 }}>Réf.</th>
                  <th className="text-left px-3 py-2.5 font-medium text-xs" style={{ color: 'var(--text2)' }}>Désignation</th>
                  <th className="text-right px-3 py-2.5 font-medium text-xs" style={{ color: 'var(--text2)', width: 60 }}>Qté</th>
                  <th className="text-right px-3 py-2.5 font-medium text-xs" style={{ color: 'var(--text2)', width: 90 }}>Estimatif</th>
                  {companies.map((c, i) => (
                    <th
                      key={c.id}
                      className="text-right px-3 py-2.5 font-medium text-xs cursor-pointer hover:opacity-70 select-none"
                      style={{ color: COMPANY_COLORS[i % COMPANY_COLORS.length], width: 130 }}
                      onClick={() => setSortByCompanyId(sortByCompanyId === c.id ? null : c.id)}
                      title="Cliquer pour trier"
                    >
                      {c.name}{sortByCompanyId === c.id && ' ↑'}
                    </th>
                  ))}
                  <th className="text-right px-3 py-2.5 font-medium text-xs" style={{ color: 'var(--text2)', width: 80 }}>Min</th>
                  <th className="text-right px-3 py-2.5 font-medium text-xs" style={{ color: 'var(--text2)', width: 80 }}>Max</th>
                  <th className="text-right px-3 py-2.5 font-medium text-xs" style={{ color: 'var(--text2)', width: 70 }}>Écart %</th>
                </tr>
              </thead>
              <tbody>
                {sortedPosts.map((post, i) => {
                  const ecartPct =
                    post.minPrice != null && post.maxPrice != null && post.maxPrice !== 0
                      ? (((post.maxPrice - post.minPrice) / post.maxPrice) * 100).toFixed(0) + '%'
                      : '—'
                  return (
                    <tr key={post.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                      <td className="px-3 py-2.5 font-mono text-xs" style={{ color: 'var(--text3)' }}>{post.ref}</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--text)' }}>
                        <span className="flex items-center gap-1.5">
                          {post.title}
                          {post.hasQtyDivergence && <span title="Métrés divergents" style={{ color: 'var(--amber)' }}>⚠</span>}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: 'var(--text2)' }}>
                        {post.qtyArchi ?? '—'} {post.unit}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: 'var(--text2)' }}>
                        {formatPrice(post.totalArchi)}
                      </td>
                      {companies.map((c) => {
                        const op = c.offerPosts[post.id]
                        const qty = op?.qtyCompany ?? post.qtyArchi
                        const total = qty != null && op?.unitPrice != null ? qty * op.unitPrice : null
                        const isMin = c.id === post.minCompanyId && total != null
                        const isMax = c.id === post.maxCompanyId && total != null && post.minCompanyId !== post.maxCompanyId
                        return (
                          <td key={c.id} className="px-3 py-2.5 text-right tabular-nums text-sm"
                            style={{
                              color: isMin ? 'var(--green)' : isMax ? 'var(--red)' : 'var(--text)',
                              fontWeight: isMin || isMax ? 600 : 400,
                              background: isMin ? 'rgba(26,92,58,0.06)' : isMax ? 'rgba(155,28,28,0.06)' : undefined,
                            }}>
                            {op ? (
                              <>
                                <div>{formatPrice(total)}</div>
                                {op.unitPrice != null && <div className="text-xs" style={{ color: 'var(--text3)' }}>{formatPrice(op.unitPrice)}/{post.unit}</div>}
                              </>
                            ) : <span style={{ color: 'var(--text3)' }}>—</span>}
                          </td>
                        )
                      })}
                      <td className="px-3 py-2.5 text-right tabular-nums font-medium text-xs" style={{ color: 'var(--green)' }}>{formatPrice(post.minPrice)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-medium text-xs" style={{ color: 'var(--red)' }}>{formatPrice(post.maxPrice)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-xs" style={{ color: 'var(--text2)' }}>{ecartPct}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Selection */}
      {!readOnly && <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Sélection des entreprises</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {rankedResults.map((result) => {
            const c = companies.find((x) => x.id === result.companyId)!
            const isSelected = selectedCompanyIds.includes(c.id)
            return (
              <div key={c.id} className="p-4 rounded-[var(--radius-lg)] transition-all"
                style={{
                  background: 'var(--surface)',
                  border: isSelected ? '2px solid var(--green)' : '1px solid var(--border)',
                  boxShadow: isSelected ? '0 0 0 3px rgba(26,92,58,0.1)' : 'var(--shadow-sm)',
                }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: isSelected ? 'var(--green)' : 'var(--text)' }}>
                      {c.name}
                    </p>
                    <p className="text-sm font-semibold tabular-nums mt-0.5" style={{ color: scoreColor(result.globalScore) }}>
                      Score : {result.globalScore}/100
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{fmt(c.total)}</p>
                  </div>
                  <button
                    onClick={() => toggleSelect(c.id)}
                    className="shrink-0 ml-2 text-xs px-2 py-1 rounded transition-colors"
                    style={{
                      background: isSelected ? 'var(--green-light)' : 'var(--surface2)',
                      color: isSelected ? 'var(--green)' : 'var(--text2)',
                      border: `1px solid ${isSelected ? 'var(--green)' : 'var(--border)'}`,
                    }}
                  >
                    {isSelected ? '✓ Retenue' : 'Sélectionner'}
                  </button>
                </div>
                <textarea
                  value={companyNotes[c.id] ?? ''}
                  onChange={(e) => setCompanyNotes((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  rows={2}
                  placeholder="Note interne..."
                  className="w-full rounded-[var(--radius)] px-2.5 py-1.5 text-xs resize-none focus:outline-none"
                  style={{ border: '1px solid var(--border)', color: 'var(--text2)', background: 'var(--surface2)' }}
                />
              </div>
            )
          })}
        </div>
      </div>}

      {/* Award dialog */}
      <Dialog open={awardModalOpen} onOpenChange={setAwardModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Attribuer le marché</DialogTitle></DialogHeader>
          <p className="text-sm mb-4" style={{ color: 'var(--text2)' }}>
            Sélectionnez l&apos;entreprise retenue pour ce marché :
          </p>
          <div className="space-y-2">
            {rankedResults.map((r, idx) => {
              const isSelected = awardingCompanyId === r.companyId
              return (
                <button
                  key={r.companyId}
                  onClick={() => setAwardingCompanyId(r.companyId)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-[var(--radius)] text-left transition-all"
                  style={{
                    background: isSelected ? 'var(--green-light)' : 'var(--surface2)',
                    border: `1px solid ${isSelected ? 'var(--green)' : 'var(--border)'}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 12, color: 'var(--text3)', minWidth: 20 }}>#{idx + 1}</span>
                    <span className="text-sm font-medium" style={{ color: isSelected ? 'var(--green)' : 'var(--text)' }}>
                      {r.companyName}
                    </span>
                  </div>
                  <span className="text-sm tabular-nums font-medium" style={{ color: isSelected ? 'var(--green)' : 'var(--text2)' }}>
                    {fmt(companies.find((c) => c.id === r.companyId)?.total ?? null)}
                  </span>
                </button>
              )
            })}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAwardModalOpen(false)} disabled={awarding}>Annuler</Button>
            <Button
              onClick={() => void handleAward()}
              disabled={!awardingCompanyId || awarding}
              style={{ background: '#B45309', color: '#fff', border: 'none' }}
            >
              <Trophy size={14} className="mr-1.5" />
              {awarding ? 'Attribution...' : 'Confirmer l\'attribution'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Publier au client</DialogTitle></DialogHeader>
          <p className="text-sm mb-4" style={{ color: 'var(--text2)' }}>
            Choisissez les éléments à rendre visibles dans l&apos;espace client.
          </p>
          <div className="space-y-2.5">
            {[
              { key: 'companies', label: 'Nombre d\'entreprises consultées', indent: false },
              { key: 'offers', label: 'Offres reçues et taux de réponse', indent: false },
              { key: 'progress', label: 'Avancement des réponses par entreprise', indent: false },
              { key: 'analysis', label: 'Débloquer l\'analyse comparative', indent: false, bold: true },
              { key: 'ranking', label: 'Classement des entreprises', indent: true },
              { key: 'graphiques', label: 'Graphiques par lot', indent: true },
              { key: 'tableau', label: 'Tableau comparatif détaillé', indent: true },
              { key: 'full_analysis', label: 'Vue complète (scoring multicritères, détail des notes)', indent: true, bold: false },
            ].map(({ key, label, indent, bold }) => (
              <label key={key} className="flex items-center gap-2.5 cursor-pointer" style={{ paddingLeft: indent ? '20px' : '0' }}>
                <input
                  type="checkbox"
                  checked={publishElements[key as keyof typeof publishElements]}
                  onChange={(e) => setPublishElements((prev) => ({ ...prev, [key]: e.target.checked }))}
                  className="w-4 h-4"
                  disabled={indent && !publishElements.analysis}
                />
                <span className="text-sm" style={{ color: indent && !publishElements.analysis ? 'var(--text3)' : 'var(--text)', fontWeight: bold ? 600 : 400 }}>{label}</span>
              </label>
            ))}
          </div>
          {selectedCompanyIds.length > 0 && (
            <p className="text-xs mt-3 px-3 py-2 rounded-[var(--radius)]" style={{ background: 'var(--green-light)', color: 'var(--green)' }}>
              {selectedCompanyIds.length} entreprise{selectedCompanyIds.length > 1 ? 's' : ''} sélectionnée{selectedCompanyIds.length > 1 ? 's' : ''}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialogOpen(false)} disabled={publishing}>Annuler</Button>
            <Button onClick={() => void handlePublish()} disabled={publishing}
              style={{ background: 'var(--green-btn)', color: '#fff', border: 'none' }}>
              {publishing ? 'Publication...' : 'Publier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fiche entreprise */}
      {sheetCompanyId && (
        <CompanySheet
          aoId={ao.id}
          companyId={sheetCompanyId}
          open={!!sheetCompanyId}
          onClose={() => setSheetCompanyId(null)}
        />
      )}
    </div>
  )
}
