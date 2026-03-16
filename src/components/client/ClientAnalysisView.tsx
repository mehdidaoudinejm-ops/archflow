'use client'

import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const COMPANY_COLORS = ['#2D7A50', '#B45309', '#1d4ed8', '#7c3aed', '#be123c', '#0891b2']

function fmtEur(v: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v)
}

function medal(i: number) {
  if (i === 0) return '🥇'
  if (i === 1) return '🥈'
  if (i === 2) return '🥉'
  return `${i + 1}.`
}

export interface AnonymizedCompany {
  letter: string
  isSelected: boolean
  total: number
}

export interface ClientPostPrice {
  letter: string
  unitPrice: number | null
  qty: number | null
  total: number | null
  isMin: boolean
  isMax: boolean
}

export interface ClientPost {
  ref: string
  title: string
  unit: string
  qtyArchi: number | null
  hasQtyDivergence: boolean
  prices: ClientPostPrice[]
}

export interface ClientLot {
  id: string
  number: number
  name: string
  posts: ClientPost[]
}

interface Props {
  publishedElements: Record<string, unknown>
  companies: AnonymizedCompany[]
  lots: ClientLot[]
}

export function ClientAnalysisView({ publishedElements, companies, lots }: Props) {
  const [selectedLotId, setSelectedLotId] = useState<string>('all')

  const chartData = useMemo(() => {
    return lots.map((lot) => {
      const row: Record<string, string | number> = { name: `Lot ${lot.number}` }
      companies.forEach((c) => {
        const lotTotal = lot.posts.reduce((sum, post) => {
          const price = post.prices.find((p) => p.letter === c.letter)
          return sum + (price?.total ?? 0)
        }, 0)
        row[`Ent. ${c.letter}`] = lotTotal
      })
      return row
    })
  }, [lots, companies])

  const visiblePosts = useMemo(() => {
    if (selectedLotId === 'all') {
      return lots.flatMap((l) =>
        l.posts.map((p) => ({ ...p, lotName: l.name, lotNumber: l.number }))
      )
    }
    const lot = lots.find((l) => l.id === selectedLotId)
    return (lot?.posts ?? []).map((p) => ({
      ...p,
      lotName: lot!.name,
      lotNumber: lot!.number,
    }))
  }, [lots, selectedLotId])

  if (companies.length === 0) {
    return (
      <div
        className="p-6 rounded-[var(--radius-lg)] text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--text2)' }}>
          Aucune offre soumise pour le moment.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Classement */}
      {!!publishedElements.ranking && (
        <div
          className="rounded-[var(--radius-lg)] overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div
            className="px-4 py-3 border-b"
            style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Classement des offres
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {companies.map((c, i) => {
              const bestTotal = companies[0].total
              const pctVsBest =
                i > 0 && bestTotal > 0
                  ? `+${(((c.total - bestTotal) / bestTotal) * 100).toFixed(1)}%`
                  : null
              return (
                <div key={c.letter} className="flex items-center justify-between px-4 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl w-8 text-center">{medal(i)}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                          Entreprise {c.letter}
                        </span>
                        {c.isSelected && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: 'var(--green-light)', color: 'var(--green)' }}
                          >
                            Retenue
                          </span>
                        )}
                      </div>
                      {pctVsBest && (
                        <span className="text-xs" style={{ color: 'var(--text3)' }}>
                          {pctVsBest} vs offre la plus basse
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className="text-base font-semibold tabular-nums"
                    style={{ color: i === 0 ? 'var(--green)' : 'var(--text)' }}
                  >
                    {fmtEur(c.total)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Graphique */}
      {!!publishedElements.graphiques && (
        <div
          className="rounded-[var(--radius-lg)] overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div
            className="px-4 py-3 border-b"
            style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Répartition par lot
            </p>
          </div>
          <div className="px-4 py-4">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barCategoryGap="30%" barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: 'var(--text2)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: 'var(--text3)' }}
                  axisLine={false}
                  tickLine={false}
                  width={45}
                />
                <Tooltip
                  formatter={(value: number | undefined, name: string | undefined) => [value != null ? fmtEur(value) : '—', name ?? ''] as [string, string]}
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: 12,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                  iconType="square"
                  iconSize={10}
                />
                {companies.map((c, i) => (
                  <Bar
                    key={c.letter}
                    dataKey={`Ent. ${c.letter}`}
                    fill={COMPANY_COLORS[i % COMPANY_COLORS.length]}
                    radius={[3, 3, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tableau comparatif */}
      {!!publishedElements.tableau && (
        <div
          className="rounded-[var(--radius-lg)] overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div
            className="px-4 py-3 border-b flex items-center justify-between flex-wrap gap-2"
            style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Détail des postes
            </p>
            {/* Lot filter */}
            <div className="flex gap-1 flex-wrap">
              {[{ id: 'all', label: 'Tous' }, ...lots.map((l) => ({ id: l.id, label: `Lot ${l.number}` }))].map(
                (opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedLotId(opt.id)}
                    className="text-xs px-2.5 py-1 rounded-full border transition-colors"
                    style={{
                      background: selectedLotId === opt.id ? 'var(--green)' : 'var(--surface)',
                      color: selectedLotId === opt.id ? '#fff' : 'var(--text2)',
                      borderColor: selectedLotId === opt.id ? 'var(--green)' : 'var(--border)',
                    }}
                  >
                    {opt.label}
                  </button>
                )
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={{ minWidth: `${400 + companies.length * 160}px` }}>
              <thead>
                <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left px-3 py-2.5 font-medium" style={{ color: 'var(--text3)', width: 70 }}>Réf.</th>
                  <th className="text-left px-3 py-2.5 font-medium" style={{ color: 'var(--text3)' }}>Désignation</th>
                  <th className="text-right px-3 py-2.5 font-medium" style={{ color: 'var(--text3)', width: 60 }}>Qté</th>
                  <th className="text-left px-3 py-2.5 font-medium" style={{ color: 'var(--text3)', width: 50 }}>Unité</th>
                  {companies.map((c, i) => (
                    <th
                      key={c.letter}
                      className="text-right px-3 py-2.5 font-medium"
                      style={{ color: COMPANY_COLORS[i % COMPANY_COLORS.length], width: 155 }}
                    >
                      Ent. {c.letter}
                      {c.isSelected && ' ✓'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visiblePosts.map((post, idx) => (
                  <tr
                    key={post.ref + idx}
                    style={{
                      background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface2)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--text3)', fontFamily: 'monospace' }}>
                      {post.ref}
                    </td>
                    <td className="px-3 py-2" style={{ color: 'var(--text)' }}>
                      {post.title}
                      {post.hasQtyDivergence && (
                        <span className="ml-1.5 text-xs" style={{ color: 'var(--amber)' }} title="Métré modifié par une entreprise">⚠</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: 'var(--text2)' }}>
                      {post.qtyArchi ?? '—'}
                    </td>
                    <td className="px-3 py-2" style={{ color: 'var(--text3)' }}>
                      {post.unit}
                    </td>
                    {post.prices.map((price) => {
                      const bg = price.isMin
                        ? 'rgba(26,92,58,0.07)'
                        : price.isMax
                        ? 'rgba(155,28,28,0.07)'
                        : 'transparent'
                      const textColor = price.isMin
                        ? 'var(--green)'
                        : price.isMax
                        ? 'var(--red)'
                        : 'var(--text2)'
                      return (
                        <td
                          key={price.letter}
                          className="px-3 py-2 text-right tabular-nums"
                          style={{ background: bg }}
                        >
                          {price.total != null ? (
                            <span style={{ color: textColor }}>
                              <span className="font-semibold" style={{ color: textColor }}>
                                {fmtEur(price.total)}
                              </span>
                              {price.unitPrice != null && (
                                <span
                                  className="block"
                                  style={{ color: 'var(--text3)', fontSize: 10, marginTop: 1 }}
                                >
                                  {fmtEur(price.unitPrice)} / {post.unit}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text3)' }}>—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
