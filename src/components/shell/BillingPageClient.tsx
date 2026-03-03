'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2, CreditCard } from 'lucide-react'

type Plan = 'SOLO' | 'STUDIO' | 'AGENCY'

interface PlanConfig {
  key: Plan
  label: string
  price: string
  priceId: string
  description: string
  features: string[]
}

const PLANS: PlanConfig[] = [
  {
    key: 'SOLO',
    label: 'Solo',
    price: 'Gratuit',
    priceId: '',
    description: 'Pour les indépendants',
    features: ['1 utilisateur', '3 projets actifs', 'Module DPGF', 'Import IA (5/mois)'],
  },
  {
    key: 'STUDIO',
    label: 'Studio',
    price: '49 €/mois',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STUDIO ?? 'price_studio',
    description: 'Pour les petits cabinets',
    features: ['3 utilisateurs', '20 projets actifs', 'Tous les modules', 'Import IA illimité', 'Support prioritaire'],
  },
  {
    key: 'AGENCY',
    label: 'Agence',
    price: '99 €/mois',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY ?? 'price_agency',
    description: 'Pour les agences',
    features: ['Utilisateurs illimités', 'Projets illimités', 'Tous les modules', 'Import IA illimité', 'API accès', 'SLA 99.9%'],
  },
]

interface BillingPageClientProps {
  currentPlan: Plan
  hasStripeCustomer: boolean
}

export function BillingPageClient({ currentPlan, hasStripeCustomer }: BillingPageClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleUpgrade(priceId: string) {
    if (!priceId || loading) return
    setLoading(priceId)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error ?? 'Erreur lors de la création de la session')
        setLoading(null)
      }
    } catch {
      setError('Erreur réseau')
      setLoading(null)
    }
  }

  async function handleManage() {
    setLoading('portal')
    setError(null)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json() as { url?: string; error?: string }
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error ?? "Erreur d'accès au portail")
        setLoading(null)
      }
    } catch {
      setError('Erreur réseau')
      setLoading(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: 'var(--font-dm-serif)', color: 'var(--text)' }}
          >
            Facturation
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text2)' }}>
            Gérez votre abonnement ArchFlow
          </p>
        </div>

        {hasStripeCustomer && (
          <button
            onClick={handleManage}
            disabled={!!loading}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-[var(--radius)] border font-medium"
            style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--surface)' }}
          >
            {loading === 'portal' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CreditCard size={14} />
            )}
            Gérer l&apos;abonnement
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm px-4 py-3 rounded-[var(--radius)]" style={{ background: 'var(--red-light)', color: 'var(--red)' }}>
          {error}
        </p>
      )}

      {/* Grille des plans */}
      <div className="grid grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentPlan
          return (
            <div
              key={plan.key}
              className="flex flex-col p-5 rounded-[var(--radius-lg)]"
              style={{
                background: 'var(--surface)',
                border: isCurrent ? '2px solid var(--green)' : '1px solid var(--border)',
                boxShadow: isCurrent ? '0 0 0 3px var(--green-light)' : 'var(--shadow-sm)',
              }}
            >
              <div className="flex items-start justify-between mb-1">
                <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
                  {plan.label}
                </h2>
                {isCurrent && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'var(--green-light)', color: 'var(--green)' }}
                  >
                    Actuel
                  </span>
                )}
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--text3)' }}>
                {plan.description}
              </p>
              <p className="text-xl font-bold mb-4" style={{ color: 'var(--text)' }}>
                {plan.price}
              </p>

              <ul className="flex-1 space-y-2 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text2)' }}>
                    <CheckCircle size={13} style={{ color: 'var(--green)', flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>

              {!isCurrent && plan.priceId && (
                <button
                  onClick={() => handleUpgrade(plan.priceId)}
                  disabled={!!loading}
                  className="flex items-center justify-center gap-2 w-full py-2 text-sm rounded-[var(--radius)] font-medium"
                  style={{
                    background: loading === plan.priceId ? 'var(--surface2)' : 'var(--green-btn)',
                    color: loading === plan.priceId ? 'var(--text3)' : '#fff',
                    border: 'none',
                  }}
                >
                  {loading === plan.priceId && <Loader2 size={13} className="animate-spin" />}
                  {plan.key === 'SOLO' ? 'Rétrograder' : 'Passer à ce plan'}
                </button>
              )}
              {isCurrent && (
                <div
                  className="flex items-center justify-center py-2 text-sm rounded-[var(--radius)]"
                  style={{ background: 'var(--green-light)', color: 'var(--green)' }}
                >
                  Plan actuel
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Lien retour paramètres */}
      <p className="text-xs" style={{ color: 'var(--text3)' }}>
        <button
          onClick={() => router.push('/settings')}
          className="underline hover:no-underline"
        >
          ← Retour aux paramètres
        </button>
      </p>
    </div>
  )
}
