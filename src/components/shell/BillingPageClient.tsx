'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2, CreditCard } from 'lucide-react'

type Plan = 'SOLO' | 'STUDIO' | 'AGENCY'

interface PlanLimitConfig {
  collaboratorLimit: number
  aiImportLimit:     number
  price:             number
  label:             string
  description:       string
  features:          string[]
}

const PRICE_IDS: Record<Plan, string> = {
  SOLO:   '',
  STUDIO: process.env.NEXT_PUBLIC_STRIPE_PRICE_STUDIO ?? 'price_studio',
  AGENCY: process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY ?? 'price_agency',
}

function formatPrice(price: number): string {
  if (price === 0) return 'Gratuit'
  return `${price} €/mois`
}

interface BillingPageClientProps {
  currentPlan:  Plan
  hasStripeCustomer: boolean
  planConfigs: Record<Plan, PlanLimitConfig>
}

export function BillingPageClient({ currentPlan, hasStripeCustomer, planConfigs }: BillingPageClientProps) {
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
        {(['SOLO', 'STUDIO', 'AGENCY'] as Plan[]).map((planKey) => {
          const plan = planConfigs[planKey]
          const priceId = PRICE_IDS[planKey]
          const isCurrent = planKey === currentPlan
          return (
            <div
              key={planKey}
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
                {formatPrice(plan.price)}
              </p>

              <ul className="flex-1 space-y-2 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text2)' }}>
                    <CheckCircle size={13} style={{ color: 'var(--green)', flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>

              {!isCurrent && priceId && (
                <button
                  onClick={() => handleUpgrade(priceId)}
                  disabled={!!loading}
                  className="flex items-center justify-center gap-2 w-full py-2 text-sm rounded-[var(--radius)] font-medium"
                  style={{
                    background: loading === priceId ? 'var(--surface2)' : 'var(--green-btn)',
                    color: loading === priceId ? 'var(--text3)' : '#fff',
                    border: 'none',
                  }}
                >
                  {loading === priceId && <Loader2 size={13} className="animate-spin" />}
                  {planKey === 'SOLO' ? 'Rétrograder' : 'Passer à ce plan'}
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
