'use client'

import type { DPGFWithLots } from '@/types'

interface StatsBarProps {
  dpgf: DPGFWithLots | null
  libraryCount?: number
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function StatsBar({ dpgf, libraryCount }: StatsBarProps) {
  const allPosts = dpgf?.lots.flatMap((l) => [
    ...l.posts,
    ...l.sublots.flatMap((sl) => sl.posts),
  ]) ?? []

  const totalEstimate = allPosts.reduce((sum, p) => {
    if (p.qtyArchi != null && p.unitPriceArchi != null) {
      return sum + p.qtyArchi * p.unitPriceArchi
    }
    return sum
  }, 0)

  const missingPrices = allPosts.filter(
    (p) => !p.isOptional && p.unitPriceArchi == null
  ).length

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      <Card
        label="Estimatif total"
        value={allPosts.length > 0 && totalEstimate > 0 ? formatPrice(totalEstimate) : '—'}
        sub={`${dpgf?.lots.length ?? 0} lot${(dpgf?.lots.length ?? 0) !== 1 ? 's' : ''}`}
      />
      <Card
        label="Postes"
        value={String(allPosts.length)}
        sub="dans la DPGF"
      />
      <Card
        label="Prix manquants"
        value={String(missingPrices)}
        sub="postes sans prix unitaire"
        accent={missingPrices > 0 ? 'amber' : undefined}
      />
      <Card
        label="Bibliothèque"
        value={libraryCount != null ? String(libraryCount) : '—'}
        sub="intitulés enregistrés"
      />
    </div>
  )
}

function Card({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub: string
  accent?: 'amber'
}) {
  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <p
        className="text-xs font-medium uppercase tracking-wide"
        style={{ color: 'var(--text3)' }}
      >
        {label}
      </p>
      <p
        className="text-2xl font-semibold mt-1 tabular-nums"
        style={{
          fontFamily: 'var(--font-dm-serif)',
          color: accent === 'amber' ? 'var(--amber)' : 'var(--text)',
        }}
      >
        {value}
      </p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
        {sub}
      </p>
    </div>
  )
}
