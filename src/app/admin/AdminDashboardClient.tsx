'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Stats {
  totalArchitects: number
  totalProjects: number
  totalAOs: number
  totalOffers: number
  totalCompanies: number
  mrr: number
  waitlistPending: number
  waitlistTotal: number
  weeklySignups: { week: string; count: number }[]
  funnel: {
    waitlistTotal: number
    activatedAccounts: number
    projectCreated: number
    aoLaunched: number
  }
}

const ADMIN_RED = '#DC2626'

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      className="rounded-[var(--radius-lg)] p-5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <p className="text-xs font-medium mb-1" style={{ color: 'var(--text3)' }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--text3)' }}>{sub}</p>}
    </div>
  )
}

function FunnelBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm w-48 flex-shrink-0" style={{ color: 'var(--text2)' }}>{label}</span>
      <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: ADMIN_RED }}
        />
      </div>
      <span className="text-sm font-semibold w-12 text-right" style={{ color: 'var(--text)' }}>{value}</span>
      <span className="text-xs w-10 text-right" style={{ color: 'var(--text3)' }}>{pct}%</span>
    </div>
  )
}

export function AdminDashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then((d: Stats) => setStats(d))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <p style={{ color: 'var(--text3)' }}>Chargement des stats...</p>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="p-8 space-y-8 max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--text)' }}>Dashboard</h1>
        <p className="text-sm" style={{ color: 'var(--text3)' }}>Vue d&apos;ensemble de la plateforme</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
        <StatCard label="Architectes inscrits" value={stats.totalArchitects} />
        <StatCard label="Projets créés" value={stats.totalProjects} />
        <StatCard label="AO lancés" value={stats.totalAOs} />
        <StatCard label="Offres soumises" value={stats.totalOffers} />
        <StatCard label="Entreprises" value={stats.totalCompanies} />
        <StatCard label="MRR estimé" value={`${stats.mrr} €`} sub="plans payants" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Graphique inscriptions */}
        <div
          className="rounded-[var(--radius-lg)] p-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
            Inscriptions par semaine
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.weeklySignups} barSize={20}>
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: 'var(--text3)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text3)' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={24}
              />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) => [v, 'Inscriptions']}
              />
              <Bar dataKey="count" fill={ADMIN_RED} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Funnel */}
        <div
          className="rounded-[var(--radius-lg)] p-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <h2 className="text-sm font-semibold mb-5" style={{ color: 'var(--text)' }}>
            Funnel de conversion
          </h2>
          <div className="space-y-4">
            <FunnelBar
              label="Demandes waitlist"
              value={stats.funnel.waitlistTotal}
              max={stats.funnel.waitlistTotal}
            />
            <FunnelBar
              label="Comptes activés"
              value={stats.funnel.activatedAccounts}
              max={stats.funnel.waitlistTotal}
            />
            <FunnelBar
              label="Projet créé"
              value={stats.funnel.projectCreated}
              max={stats.funnel.waitlistTotal}
            />
            <FunnelBar
              label="AO lancé"
              value={stats.funnel.aoLaunched}
              max={stats.funnel.waitlistTotal}
            />
          </div>
        </div>
      </div>

      {/* Waitlist pending */}
      {stats.waitlistPending > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius)]"
          style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
        >
          <span className="text-sm font-medium" style={{ color: ADMIN_RED }}>
            {stats.waitlistPending} demande{stats.waitlistPending > 1 ? 's' : ''} en attente de validation
          </span>
          <a
            href="/admin/waitlist"
            className="text-sm font-semibold underline ml-auto"
            style={{ color: ADMIN_RED }}
          >
            Gérer →
          </a>
        </div>
      )}
    </div>
  )
}
