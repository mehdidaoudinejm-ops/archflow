'use client'

import { useState, useEffect } from 'react'
import { Save, Plus, X, RefreshCw, CheckCircle2 } from 'lucide-react'

type PlanKey = 'SOLO' | 'STUDIO' | 'AGENCY'

interface PlanConfig {
  plan:              PlanKey
  collaboratorLimit: number
  aiImportLimit:     number
  price:             number
  label:             string
  description:       string
  features:          string[]
}

const PLAN_ACCENT: Record<PlanKey, { bg: string; color: string; border: string }> = {
  SOLO:   { bg: '#F3F3F0', color: '#6B6B65', border: '#D4D4CC' },
  STUDIO: { bg: '#EAF3ED', color: '#1A5C3A', border: '#C5DFD0' },
  AGENCY: { bg: '#FEF3E2', color: '#B45309', border: '#F5D49C' },
}

export default function PlansAdminPage() {
  const [configs, setConfigs] = useState<PlanConfig[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState<PlanKey | null>(null)
  const [saved, setSaved]       = useState<PlanKey | null>(null)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    void fetchConfigs()
  }, [])

  async function fetchConfigs() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/plan-configs')
      const data = await res.json() as PlanConfig[]
      setConfigs(data)
    } catch {
      setError('Impossible de charger les configurations')
    }
    setLoading(false)
  }

  function updateField<K extends keyof PlanConfig>(plan: PlanKey, key: K, value: PlanConfig[K]) {
    setConfigs((prev) =>
      prev.map((c) => (c.plan === plan ? { ...c, [key]: value } : c))
    )
  }

  function addFeature(plan: PlanKey) {
    setConfigs((prev) =>
      prev.map((c) => (c.plan === plan ? { ...c, features: [...c.features, ''] } : c))
    )
  }

  function updateFeature(plan: PlanKey, idx: number, value: string) {
    setConfigs((prev) =>
      prev.map((c) =>
        c.plan === plan
          ? { ...c, features: c.features.map((f, i) => (i === idx ? value : f)) }
          : c
      )
    )
  }

  function removeFeature(plan: PlanKey, idx: number) {
    setConfigs((prev) =>
      prev.map((c) =>
        c.plan === plan
          ? { ...c, features: c.features.filter((_, i) => i !== idx) }
          : c
      )
    )
  }

  async function save(plan: PlanKey) {
    const config = configs.find((c) => c.plan === plan)
    if (!config) return
    setSaving(plan)
    setError(null)
    try {
      const res = await fetch('/api/admin/plan-configs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          features: config.features.filter((f) => f.trim() !== ''),
        }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Erreur lors de la sauvegarde')
      } else {
        setSaved(plan)
        setTimeout(() => setSaved(null), 2500)
      }
    } catch {
      setError('Erreur réseau')
    }
    setSaving(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--text3)' }} />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-6">
      <div className="mb-8">
        <h1
          className="text-2xl font-semibold mb-1"
          style={{ fontFamily: 'var(--font-dm-serif)', color: 'var(--text)' }}
        >
          Gestion des plans
        </h1>
        <p className="text-sm" style={{ color: 'var(--text2)' }}>
          Configurez les limites et fonctionnalités de chaque plan. Les modifications sont appliquées immédiatement.
        </p>
      </div>

      {error && (
        <div
          className="mb-6 px-4 py-3 rounded-[var(--radius)] text-sm"
          style={{ background: 'var(--red-light)', color: 'var(--red)' }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        {configs.map((config) => {
          const accent = PLAN_ACCENT[config.plan]
          const isSaving = saving === config.plan
          const isSaved  = saved  === config.plan
          return (
            <div
              key={config.plan}
              className="rounded-[var(--radius-lg)] overflow-hidden"
              style={{ border: `1px solid ${accent.border}`, background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}
            >
              {/* Header */}
              <div
                className="px-5 py-4 flex items-center justify-between"
                style={{ background: accent.bg, borderBottom: `1px solid ${accent.border}` }}
              >
                <div>
                  <input
                    className="text-base font-bold bg-transparent outline-none w-full"
                    style={{ color: accent.color }}
                    value={config.label}
                    onChange={(e) => updateField(config.plan, 'label', e.target.value)}
                    placeholder="Nom du plan"
                  />
                  <p className="text-xs mt-0.5" style={{ color: accent.color, opacity: 0.7 }}>
                    {config.plan}
                  </p>
                </div>
                <button
                  onClick={() => void save(config.plan)}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] text-xs font-medium transition-colors disabled:opacity-60"
                  style={{ background: isSaved ? '#1A5C3A' : accent.color, color: '#fff', border: 'none' }}
                >
                  {isSaving ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : isSaved ? (
                    <><CheckCircle2 size={12} /> Sauvegardé</>
                  ) : (
                    <><Save size={12} /> Sauvegarder</>
                  )}
                </button>
              </div>

              {/* Contenu */}
              <div className="px-5 py-4 space-y-4">
                {/* Description */}
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>
                    Description
                  </label>
                  <input
                    className="w-full text-sm px-3 py-1.5 rounded-[var(--radius)] outline-none"
                    style={{ border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)' }}
                    value={config.description}
                    onChange={(e) => updateField(config.plan, 'description', e.target.value)}
                    placeholder="Description courte"
                  />
                </div>

                {/* Prix */}
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>
                    Prix (€/mois)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="w-full text-sm px-3 py-1.5 rounded-[var(--radius)] outline-none tabular-nums"
                      style={{ border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)' }}
                      value={config.price}
                      onChange={(e) => updateField(config.plan, 'price', parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-xs shrink-0" style={{ color: 'var(--text3)' }}>€/mois</span>
                  </div>
                  {config.price === 0 && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>Affiché « Gratuit »</p>
                  )}
                </div>

                {/* Limites */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>
                      Collaborateurs max
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="w-full text-sm px-3 py-1.5 rounded-[var(--radius)] outline-none tabular-nums"
                      style={{ border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)' }}
                      value={config.collaboratorLimit}
                      onChange={(e) => updateField(config.plan, 'collaboratorLimit', parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text2)' }}>
                      Imports IA/mois
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="w-full text-sm px-3 py-1.5 rounded-[var(--radius)] outline-none tabular-nums"
                      style={{ border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)' }}
                      value={config.aiImportLimit}
                      onChange={(e) => updateField(config.plan, 'aiImportLimit', parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                </div>

                {/* Features */}
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text2)' }}>
                    Fonctionnalités (affichées dans la page billing)
                  </label>
                  <div className="space-y-1.5">
                    {config.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          className="flex-1 text-sm px-2.5 py-1 rounded-[var(--radius)] outline-none"
                          style={{ border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)' }}
                          value={feature}
                          onChange={(e) => updateFeature(config.plan, idx, e.target.value)}
                          placeholder="ex: Module DPGF"
                        />
                        <button
                          onClick={() => removeFeature(config.plan, idx)}
                          className="p-1 rounded transition-colors"
                          style={{ color: 'var(--text3)' }}
                          title="Supprimer"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addFeature(config.plan)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-[var(--radius)] transition-colors"
                      style={{ color: accent.color, background: accent.bg, border: `1px dashed ${accent.border}` }}
                    >
                      <Plus size={12} /> Ajouter une fonctionnalité
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-6 text-xs text-center" style={{ color: 'var(--text3)' }}>
        Les limites (collaborateurs, imports IA) sont appliquées immédiatement après sauvegarde.
        Les fonctionnalités sont affichées dans la page facturation des utilisateurs.
      </p>
    </div>
  )
}
