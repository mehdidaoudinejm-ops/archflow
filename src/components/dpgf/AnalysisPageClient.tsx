'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { AlertTriangle, Download, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

// ── Types ─────────────────────────────────────────────────────────────

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

interface Company {
  id: string
  name: string
  total: number | null
  offerPosts: Record<string, OfferPostData>
  submittedAt: string | null
  adminDocsCount: number
  siretVerified: boolean
  divergences: number
}

interface AnalysisData {
  ao: {
    id: string
    name: string
    deadline: string
    status: string
    clientPublished: boolean
    publishedElements: Record<string, unknown>
  }
  project: { id: string; name: string }
  companies: Company[]
  lots: Lot[]
  totals: { estimatif: number | null; min: number | null; max: number | null; ecart: number | null }
  divergenceCount: number
}

interface Props {
  projectId: string
  projectName: string
  initialData: AnalysisData
}

// ── Helpers ───────────────────────────────────────────────────────────

function formatPrice(v: number | null): string {
  if (v == null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}

function pct(val: number | null, ref: number | null): string {
  if (val == null || ref == null || ref === 0) return ''
  const p = ((val - ref) / ref) * 100
  return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`
}

// Palette couleurs pour les entreprises
const COMPANY_COLORS = ['#2D7A50', '#B45309', '#1d4ed8', '#7c3aed', '#be123c', '#0891b2']

// ── Score pondéré (sur 100) ───────────────────────────────────────────
function computeScore(
  company: Company,
  companies: Company[],
  ao: { deadline: string },
  totalPosts: number
): number {
  const validTotals = companies.map((c) => c.total).filter((t): t is number => t !== null)
  const bestPrice = validTotals.length > 0 ? Math.min(...validTotals) : null

  // Prix (40%) — meilleur prix = 40, pire prix ≈ 0
  let prixScore = 0
  if (company.total !== null && bestPrice !== null && company.total > 0) {
    prixScore = Math.round((bestPrice / company.total) * 40)
  }

  // Documents admin (25%) — 5 types standard
  const REQUIRED_DOCS = 5
  const docsScore = Math.round(Math.min(company.adminDocsCount, REQUIRED_DOCS) / REQUIRED_DOCS * 25)

  // Délai de réponse (15%) — plus tôt = mieux
  let delaiScore = 0
  if (company.submittedAt) {
    const deadline = new Date(ao.deadline).getTime()
    const submitted = new Date(company.submittedAt).getTime()
    const ratio = Math.max(0, Math.min(1, (deadline - submitted) / (1000 * 60 * 60 * 24 * 30)))
    delaiScore = Math.round(ratio * 15)
  }

  // Divergences (20%) — pas de divergence = 20
  const divergenceScore = totalPosts > 0
    ? Math.round((1 - Math.min(company.divergences, totalPosts) / totalPosts) * 20)
    : 20

  // Bonus SIRET (5%)
  const siretScore = company.siretVerified ? 5 : 0

  return Math.min(100, prixScore + docsScore + delaiScore + divergenceScore + siretScore)
}

// ── Composant principal ───────────────────────────────────────────────

export function AnalysisPageClient({ projectId, projectName, initialData }: Props) {
  const { ao, companies, lots, totals, divergenceCount } = initialData

  const [selectedLotId, setSelectedLotId] = useState<string>('all')
  const [sortByCompanyId, setSortByCompanyId] = useState<string | null>(null)
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>(
    () => {
      const pe = ao.publishedElements
      return Array.isArray(pe?.selectedCompanyIds) ? (pe.selectedCompanyIds as string[]) : []
    }
  )
  const [companyNotes, setCompanyNotes] = useState<Record<string, string>>(
    () => {
      const pe = ao.publishedElements
      return (pe?.companyNotes ?? {}) as Record<string, string>
    }
  )
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [publishElements, setPublishElements] = useState({
    synthese: true,
    tableau: true,
    retenues: true,
    rapport: false,
  })
  const [publishing, setPublishing] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  function toggleSelect(id: string) {
    setSelectedCompanyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  // Filtrer les postes selon le lot sélectionné
  const visiblePosts = selectedLotId === 'all'
    ? lots.flatMap((l) => l.posts.map((p) => ({ ...p, lotName: l.name, lotNumber: l.number })))
    : (lots.find((l) => l.id === selectedLotId)?.posts ?? []).map((p) => {
        const lot = lots.find((l) => l.id === selectedLotId)!
        return { ...p, lotName: lot.name, lotNumber: lot.number }
      })

  // Trier par total d'une entreprise
  const sortedPosts = sortByCompanyId
    ? [...visiblePosts].sort((a, b) => {
        const getTotal = (post: Post) => {
          const op = companies.find((c) => c.id === sortByCompanyId)?.offerPosts[post.id]
          if (!op) return Infinity
          const qty = op.qtyCompany ?? post.qtyArchi
          return qty != null && op.unitPrice != null ? qty * op.unitPrice : Infinity
        }
        return getTotal(a) - getTotal(b)
      })
    : visiblePosts

  // Données graphique par lot
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

  // Scores pondérés
  const totalPosts = lots.reduce((acc, l) => acc + l.posts.length, 0)
  const companyScores = companies.map((c) => ({
    id: c.id,
    score: computeScore(c, companies, ao, totalPosts),
  }))
  const bestScore = companyScores.length > 0 ? Math.max(...companyScores.map((s) => s.score)) : 0
  const scoreMap = new Map(companyScores.map((s) => [s.id, s.score]))

  async function handlePublish() {
    setPublishing(true)
    try {
      await fetch(`/api/client/${projectId}/consultation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aoId: ao.id,
          clientPublished: true,
          publishedElements: {
            ...publishElements,
            selectedCompanyIds,
            companyNotes,
          },
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

  return (
    <div className="space-y-6 pb-12">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm" style={{ color: 'var(--text3)' }}>{projectName}</p>
          <h1
            className="text-2xl font-semibold mt-0.5"
            style={{ fontFamily: 'var(--font-dm-serif)', color: 'var(--text)' }}
          >
            Consultation
          </h1>
        </div>
        <div className="flex gap-2 mt-1">
          <Button
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="h-9 text-sm"
          >
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
      </div>

      {/* Onglets */}
      <div className="flex gap-0" style={{ borderBottom: '2px solid var(--border)' }}>
        {[
          { label: 'Consultation', href: `/dpgf/${projectId}`, active: false },
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
      </div>

      {/* Bandeau divergences */}
      {divergenceCount > 0 && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-[var(--radius)]"
          style={{ background: 'var(--amber-light)', border: '1px solid var(--amber)' }}
        >
          <AlertTriangle size={15} style={{ color: 'var(--amber)', flexShrink: 0 }} />
          <span className="text-sm" style={{ color: 'var(--amber)' }}>
            <strong>{divergenceCount}</strong> poste{divergenceCount > 1 ? 's' : ''} avec des métrés divergents entre les entreprises
          </span>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Estimatif archi', value: formatPrice(totals.estimatif), color: 'var(--text)' },
          {
            label: 'Offre la + basse',
            value: formatPrice(totals.min),
            sub: pct(totals.min, totals.estimatif),
            color: 'var(--green)',
          },
          {
            label: 'Offre la + haute',
            value: formatPrice(totals.max),
            sub: pct(totals.max, totals.estimatif),
            color: 'var(--amber)',
          },
          { label: 'Écart min / max', value: formatPrice(totals.ecart), color: 'var(--text)' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4 rounded-[var(--radius-lg)]"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            <p className="text-xs mb-1" style={{ color: 'var(--text3)' }}>{stat.label}</p>
            <p className="text-xl font-semibold tabular-nums" style={{ color: stat.color }}>
              {stat.value}
            </p>
            {stat.sub && (
              <p className="text-xs mt-0.5" style={{ color: stat.color, opacity: 0.75 }}>{stat.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Graphique */}
      <div
        className="p-5 rounded-[var(--radius-lg)]"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
          Comparaison par lot
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} barGap={3} barCategoryGap="25%">
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'var(--text2)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 10, fill: 'var(--text3)' }}
              axisLine={false}
              tickLine={false}
              width={40}
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
              formatter={(value) =>
                value === 'estimatif' ? 'Estimatif' : (companies.find((c) => c.id === value)?.name ?? value)
              }
              wrapperStyle={{ fontSize: 11 }}
            />
            <Bar dataKey="estimatif" fill="var(--text3)" radius={[3, 3, 0, 0]} />
            {companies.map((c, i) => (
              <Bar
                key={c.id}
                dataKey={c.id}
                fill={COMPANY_COLORS[i % COMPANY_COLORS.length]}
                radius={[3, 3, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filtre par lot */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedLotId('all')}
          className="px-3 py-1.5 rounded-[var(--radius)] text-sm transition-colors"
          style={{
            background: selectedLotId === 'all' ? 'var(--green-light)' : 'var(--surface)',
            color: selectedLotId === 'all' ? 'var(--green)' : 'var(--text2)',
            border: `1px solid ${selectedLotId === 'all' ? 'var(--green)' : 'var(--border)'}`,
            fontWeight: selectedLotId === 'all' ? 500 : 400,
          }}
        >
          Tous les lots
        </button>
        {lots.map((lot) => (
          <button
            key={lot.id}
            onClick={() => setSelectedLotId(lot.id)}
            className="px-3 py-1.5 rounded-[var(--radius)] text-sm transition-colors"
            style={{
              background: selectedLotId === lot.id ? 'var(--green-light)' : 'var(--surface)',
              color: selectedLotId === lot.id ? 'var(--green)' : 'var(--text2)',
              border: `1px solid ${selectedLotId === lot.id ? 'var(--green)' : 'var(--border)'}`,
              fontWeight: selectedLotId === lot.id ? 500 : 400,
            }}
          >
            Lot {lot.number} — {lot.name}
          </button>
        ))}
      </div>

      {/* Tableau comparatif */}
      <div
        className="rounded-[var(--radius-lg)] overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full text-sm" style={{ minWidth: 600 + companies.length * 130 }}>
            <thead>
              <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                <th className="text-left px-3 py-2.5 font-medium text-xs" style={{ color: 'var(--text2)', width: 60 }}>
                  Réf.
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-xs" style={{ color: 'var(--text2)' }}>
                  Désignation
                </th>
                <th className="text-right px-3 py-2.5 font-medium text-xs" style={{ color: 'var(--text2)', width: 60 }}>
                  Qté
                </th>
                <th className="text-right px-3 py-2.5 font-medium text-xs" style={{ color: 'var(--text2)', width: 90 }}>
                  Estimatif
                </th>
                {companies.map((c, i) => (
                  <th
                    key={c.id}
                    className="text-right px-3 py-2.5 font-medium text-xs cursor-pointer hover:opacity-70 select-none"
                    style={{ color: COMPANY_COLORS[i % COMPANY_COLORS.length], width: 130 }}
                    onClick={() => setSortByCompanyId(sortByCompanyId === c.id ? null : c.id)}
                    title="Cliquer pour trier"
                  >
                    {c.name}
                    {sortByCompanyId === c.id && ' ↑'}
                  </th>
                ))}
                <th className="text-right px-3 py-2.5 font-medium text-xs" style={{ color: 'var(--text2)', width: 80 }}>
                  Min
                </th>
                <th className="text-right px-3 py-2.5 font-medium text-xs" style={{ color: 'var(--text2)', width: 80 }}>
                  Max
                </th>
                <th className="text-right px-3 py-2.5 font-medium text-xs" style={{ color: 'var(--text2)', width: 70 }}>
                  Écart %
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPosts.map((post, i) => {
                const ecartPct =
                  post.minPrice != null && post.maxPrice != null && post.maxPrice !== 0
                    ? (((post.maxPrice - post.minPrice) / post.maxPrice) * 100).toFixed(0) + '%'
                    : '—'

                return (
                  <tr
                    key={post.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)',
                    }}
                  >
                    <td className="px-3 py-2.5 font-mono text-xs" style={{ color: 'var(--text3)' }}>
                      {post.ref}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--text)' }}>
                      <span className="flex items-center gap-1.5">
                        {post.title}
                        {post.hasQtyDivergence && (
                          <span title="Métrés divergents" style={{ color: 'var(--amber)' }}>⚠</span>
                        )}
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
                        <td
                          key={c.id}
                          className="px-3 py-2.5 text-right tabular-nums text-sm"
                          style={{
                            color: isMin ? 'var(--green)' : isMax ? 'var(--red)' : 'var(--text)',
                            fontWeight: isMin || isMax ? 600 : 400,
                            background: isMin
                              ? 'rgba(26,92,58,0.06)'
                              : isMax
                              ? 'rgba(155,28,28,0.06)'
                              : undefined,
                          }}
                        >
                          {op ? (
                            <>
                              <div>{formatPrice(total)}</div>
                              {op.unitPrice != null && (
                                <div className="text-xs" style={{ color: 'var(--text3)' }}>
                                  {formatPrice(op.unitPrice)}/{post.unit}
                                </div>
                              )}
                            </>
                          ) : (
                            <span style={{ color: 'var(--text3)' }}>—</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium text-xs" style={{ color: 'var(--green)' }}>
                      {formatPrice(post.minPrice)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium text-xs" style={{ color: 'var(--red)' }}>
                      {formatPrice(post.maxPrice)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs" style={{ color: 'var(--text2)' }}>
                      {ecartPct}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sélection entreprises */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
          Sélection des entreprises
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {companies.map((c, i) => {
            const isSelected = selectedCompanyIds.includes(c.id)
            return (
              <div
                key={c.id}
                className="p-4 rounded-[var(--radius-lg)] transition-all"
                style={{
                  background: 'var(--surface)',
                  border: isSelected ? `2px solid var(--green)` : '1px solid var(--border)',
                  boxShadow: isSelected ? '0 0 0 3px rgba(26,92,58,0.1)' : 'var(--shadow-sm)',
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: isSelected ? 'var(--green)' : 'var(--text)' }}
                      >
                        {c.name}
                      </p>
                      {scoreMap.get(c.id) === bestScore && bestScore > 0 && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
                          style={{ background: 'var(--green-light)', color: 'var(--green)' }}
                        >
                          Recommandée
                        </span>
                      )}
                    </div>
                    <p
                      className="text-sm font-semibold tabular-nums mt-0.5"
                      style={{ color: COMPANY_COLORS[i % COMPANY_COLORS.length] }}
                    >
                      {formatPrice(c.total)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                      Score : {scoreMap.get(c.id) ?? 0}/100
                    </p>
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
                  style={{
                    border: '1px solid var(--border)',
                    color: 'var(--text2)',
                    background: 'var(--surface2)',
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Dialog publier */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publier au client</DialogTitle>
          </DialogHeader>
          <p className="text-sm mb-4" style={{ color: 'var(--text2)' }}>
            Choisissez les éléments à rendre visibles dans l&apos;espace client.
          </p>
          <div className="space-y-2.5">
            {[
              { key: 'synthese', label: 'Synthèse des résultats (stats globales)' },
              { key: 'tableau', label: 'Tableau simplifié des offres' },
              { key: 'retenues', label: 'Entreprises retenues et notes' },
              { key: 'rapport', label: 'Lien de téléchargement du rapport PDF' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={publishElements[key as keyof typeof publishElements]}
                  onChange={(e) =>
                    setPublishElements((prev) => ({ ...prev, [key]: e.target.checked }))
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm" style={{ color: 'var(--text)' }}>{label}</span>
              </label>
            ))}
          </div>
          {selectedCompanyIds.length > 0 && (
            <p className="text-xs mt-3 px-3 py-2 rounded-[var(--radius)]"
              style={{ background: 'var(--green-light)', color: 'var(--green)' }}>
              {selectedCompanyIds.length} entreprise{selectedCompanyIds.length > 1 ? 's' : ''} sélectionnée{selectedCompanyIds.length > 1 ? 's' : ''}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialogOpen(false)} disabled={publishing}>
              Annuler
            </Button>
            <Button
              onClick={handlePublish}
              disabled={publishing}
              style={{ background: 'var(--green-btn)', color: '#fff', border: 'none' }}
            >
              {publishing ? 'Publication...' : 'Publier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
