'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { OfferPostData } from '@/hooks/useOffer'
import type { DiffStatus, RemovedPost } from '@/lib/dpgf-diff'

interface Post {
  id: string
  ref: string
  title: string
  unit: string
  qtyArchi: number | null
  isOptional: boolean
  commentArchi: string | null
}

interface Lot {
  id: string
  number: number
  name: string
  posts: Post[]
}

const VAT_OPTIONS = [5.5, 10, 20]

interface OfferTableProps {
  lots: Lot[]
  posts: Map<string, OfferPostData>
  updatePost: (postId: string, data: Partial<OfferPostData>) => void
  lotVatRates: Record<string, number>
  onUpdateLotVatRate: (lotId: string, rate: number) => void
  defaultLotVatRates: Record<string, number>
  allowCustomQty: boolean
  aoStatus: string
  isSubmitted: boolean
  onSubmitRequest: () => void
  submitDisabled?: boolean
  diffMap: Record<string, DiffStatus> | null
  removedPosts: RemovedPost[]
  newDocumentIds: string[]
}

const DIFF_BADGES: Record<DiffStatus, { label: string; bg: string; color: string } | null> = {
  added:     { label: 'Nouveau',  bg: '#EAF3ED', color: '#1A5C3A' },
  modified:  { label: 'Modifié',  bg: '#FEF3E2', color: '#B45309' },
  removed:   { label: 'Supprimé', bg: '#FEE8E8', color: '#9B1C1C' },
  unchanged: null,
}

function formatPrice(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function calcTotal(
  post: Post,
  offerPost: OfferPostData | undefined,
  allowCustomQty: boolean
): number | null {
  const unitPrice = offerPost?.unitPrice ?? null
  if (unitPrice === null) return null
  const qty = allowCustomQty && offerPost?.qtyCompany != null ? offerPost.qtyCompany : post.qtyArchi
  if (qty === null) return null
  return qty * unitPrice
}

function LotTotal({
  lot,
  posts,
  offerPosts,
  allowCustomQty,
}: {
  lot: Lot
  posts: Map<string, OfferPostData>
  offerPosts: Map<string, OfferPostData>
  allowCustomQty: boolean
}) {
  let total = 0
  let complete = true

  for (const post of lot.posts) {
    const op = offerPosts.get(post.id)
    if (op?.comment === '__SKIP__') continue
    const t = calcTotal(post, op, allowCustomQty)
    if (t === null) {
      if (!post.isOptional) complete = false
    } else {
      total += t
    }
  }

  return (
    <span style={{ color: complete ? 'var(--text)' : 'var(--text3)' }}>
      {complete ? `${formatPrice(total)} €` : '—'}
    </span>
  )
}

interface PriceInputProps {
  value: number | null
  onChange: (v: number | null) => void
  disabled: boolean
}

function PriceInput({ value, onChange, disabled }: PriceInputProps) {
  const [raw, setRaw] = useState(value !== null ? String(value) : '')

  return (
    <input
      type="number"
      min="0"
      step="0.01"
      value={raw}
      disabled={disabled}
      onChange={(e) => {
        setRaw(e.target.value)
        const parsed = parseFloat(e.target.value)
        onChange(isNaN(parsed) ? null : parsed)
      }}
      placeholder="0.00"
      className="w-full text-right tabular-nums text-sm focus:outline-none bg-transparent"
      style={{
        borderBottom: disabled ? 'none' : '1px solid var(--border2)',
        color: disabled ? 'var(--text3)' : 'var(--text)',
        padding: '2px 0',
      }}
    />
  )
}

export function OfferTable({
  lots,
  posts,
  updatePost,
  lotVatRates,
  onUpdateLotVatRate,
  defaultLotVatRates,
  allowCustomQty,
  aoStatus,
  isSubmitted,
  onSubmitRequest,
  submitDisabled = false,
  diffMap,
  removedPosts,
  newDocumentIds: _newDocumentIds,
}: OfferTableProps) {
  const isReadonly = isSubmitted || aoStatus === 'CLOSED' || aoStatus === 'ARCHIVED'
  const allPosts = lots.flatMap((l) => l.posts)
  const allPostIds = allPosts.map((p) => p.id)

  // Calcul progression
  const nonOptional = allPosts.filter((p) => !p.isOptional)
  const filled = nonOptional.filter((p) => {
    const op = posts.get(p.id)
    return op?.comment === '__SKIP__' || (op?.unitPrice !== null && op?.unitPrice !== undefined)
  })
  const progress = nonOptional.length ? Math.round((filled.length / nonOptional.length) * 100) : 100

  // Grand total HT + TVA (per-lot)
  let grandTotal = 0
  let grandTvA = 0
  let grandComplete = true
  for (const lot of lots) {
    const vatRate = lotVatRates[lot.id] ?? defaultLotVatRates[lot.id] ?? 20
    let lotHt = 0
    for (const post of lot.posts) {
      const op = posts.get(post.id)
      if (op?.comment === '__SKIP__') continue
      const t = calcTotal(post, op, allowCustomQty)
      if (t === null) {
        if (!post.isOptional) grandComplete = false
      } else {
        grandTotal += t
        lotHt += t
      }
    }
    grandTvA += lotHt * (vatRate / 100)
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Bannière soumise */}
      {isSubmitted && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius)] mb-6"
          style={{ background: 'var(--green-light)', border: '1px solid var(--green)' }}
        >
          <CheckCircle2 size={20} style={{ color: 'var(--green)', flexShrink: 0 }} />
          <p className="text-sm font-medium" style={{ color: 'var(--green)' }}>
            Votre offre a été soumise. Merci ! Vous pouvez toujours consulter vos prix ci-dessous.
          </p>
        </div>
      )}

      {/* Bouton soumission */}
      {!isReadonly && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <p className="text-sm" style={{ color: 'var(--text2)' }}>
              <span className="font-medium" style={{ color: 'var(--text)' }}>
                {filled.length}/{nonOptional.length}
              </span>{' '}
              postes obligatoires renseignés ({progress}%)
            </p>
          </div>
          <Button
            onClick={onSubmitRequest}
            disabled={submitDisabled}
            style={{
              background: submitDisabled ? 'var(--border2)' : 'var(--green-btn)',
              color: '#fff',
              border: 'none',
              cursor: submitDisabled ? 'not-allowed' : undefined,
            }}
          >
            Soumettre mon offre
          </Button>
        </div>
      )}

      {/* Tableau */}
      <div
        className="rounded-[var(--radius-lg)] overflow-hidden"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse', minWidth: 520 }}>
          <thead>
            <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
              <th className="text-left px-3 py-2.5 font-medium w-20" style={{ color: 'var(--text2)' }}>Réf</th>
              <th className="text-left px-3 py-2.5 font-medium" style={{ color: 'var(--text2)' }}>Intitulé</th>
              <th className="text-right px-3 py-2.5 font-medium w-24" style={{ color: 'var(--text2)' }}>Qté</th>
              {allowCustomQty && (
                <th className="text-right px-3 py-2.5 font-medium w-24" style={{ color: 'var(--text2)' }}>Ma qté</th>
              )}
              <th className="text-left px-3 py-2.5 font-medium w-16" style={{ color: 'var(--text2)' }}>Unité</th>
              <th className="text-right px-3 py-2.5 font-medium w-28" style={{ color: 'var(--text2)' }}>Mon prix</th>
              <th className="text-right px-3 py-2.5 font-medium w-28" style={{ color: 'var(--text2)' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {lots.map((lot, li) => {
              const vatRate = lotVatRates[lot.id] ?? defaultLotVatRates[lot.id] ?? 20
              return (
              <>
                {/* Ligne lot */}
                <tr
                  key={`lot-${lot.id}`}
                  style={{
                    background: 'var(--surface2)',
                    borderTop: li > 0 ? '2px solid var(--border)' : undefined,
                  }}
                >
                  <td
                    colSpan={allowCustomQty ? 3 : 2}
                    className="px-3 py-2 font-semibold text-sm"
                    style={{ color: 'var(--text)' }}
                  >
                    Lot {lot.number} — {lot.name}
                  </td>
                  <td colSpan={2} className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-xs" style={{ color: 'var(--text3)' }}>TVA</span>
                      {isReadonly ? (
                        <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--text2)' }}>
                          {vatRate}%
                        </span>
                      ) : (
                        <select
                          value={vatRate}
                          onChange={(e) => onUpdateLotVatRate(lot.id, parseFloat(e.target.value))}
                          className="text-xs rounded px-1 py-0.5 outline-none"
                          style={{
                            border: '1px solid var(--border)',
                            color: 'var(--text)',
                            background: 'var(--surface)',
                          }}
                        >
                          {VAT_OPTIONS.map((v) => (
                            <option key={v} value={v}>{v}%</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </td>
                  <td colSpan={2} className="px-3 py-2 text-right font-semibold text-sm" style={{ color: 'var(--text)' }}>
                    <LotTotal lot={lot} posts={posts} offerPosts={posts} allowCustomQty={allowCustomQty} />
                  </td>
                </tr>

                {/* Lignes postes */}
                {lot.posts.map((post, pi) => {
                  const offerPost = posts.get(post.id)
                  const isSkipped = offerPost?.comment === '__SKIP__'
                  const total = isSkipped ? null : calcTotal(post, offerPost, allowCustomQty)
                  const hasCustomQty =
                    allowCustomQty &&
                    offerPost?.qtyCompany !== null &&
                    offerPost?.qtyCompany !== undefined &&
                    offerPost.qtyCompany !== post.qtyArchi
                  const diffStatus = diffMap ? (diffMap[post.id] ?? null) : null
                  const diffBadge = diffStatus ? DIFF_BADGES[diffStatus] : null

                  return (
                    <tr
                      key={post.id}
                      style={{
                        borderBottom:
                          pi < lot.posts.length - 1 ? '1px solid var(--border)' : undefined,
                        opacity: isSkipped ? 0.5 : 1,
                        background: diffStatus === 'added' ? '#F4FAF6' : diffStatus === 'modified' ? '#FFFBF4' : 'var(--surface)',
                      }}
                    >
                      {/* Réf */}
                      <td className="px-3 py-2.5">
                        <span
                          className="font-mono text-xs"
                          style={{ color: 'var(--text3)' }}
                        >
                          {post.ref}
                        </span>
                      </td>

                      {/* Intitulé */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span style={{ color: 'var(--text)' }}>{post.title}</span>
                          {post.isOptional && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{ background: '#EDE9FE', color: '#5B21B6', fontWeight: 500 }}
                            >
                              OPTIONNEL
                            </span>
                          )}
                          {diffBadge && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                              style={{ background: diffBadge.bg, color: diffBadge.color }}
                            >
                              {diffBadge.label}
                            </span>
                          )}
                        </div>
                        {/* Motif qté modifiée */}
                        {hasCustomQty && (
                          <div className="mt-1">
                            <input
                              type="text"
                              value={offerPost?.qtyMotive ?? ''}
                              onChange={(e) => updatePost(post.id, { qtyMotive: e.target.value || null })}
                              placeholder="Motif de modification des quantités (requis)"
                              disabled={isReadonly || isSkipped}
                              className="w-full text-xs focus:outline-none bg-transparent"
                              style={{
                                borderBottom: '1px dashed var(--amber)',
                                color: 'var(--amber)',
                                padding: '2px 0',
                              }}
                            />
                          </div>
                        )}
                        {/* Alerte motif manquant */}
                        {hasCustomQty && !offerPost?.qtyMotive?.trim() && !isReadonly && (
                          <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--amber)' }}>
                            <AlertCircle size={11} />
                            Motif requis
                          </p>
                        )}
                      </td>

                      {/* Qté archi */}
                      <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: 'var(--text2)' }}>
                        {post.qtyArchi !== null ? post.qtyArchi.toLocaleString('fr-FR') : '—'}
                      </td>

                      {/* Ma qté */}
                      {allowCustomQty && (
                        <td className="px-3 py-2.5 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={offerPost?.qtyCompany ?? ''}
                            disabled={isReadonly || isSkipped}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value)
                              updatePost(post.id, { qtyCompany: isNaN(val) ? null : val })
                            }}
                            placeholder="—"
                            className="w-20 text-right tabular-nums text-sm focus:outline-none bg-transparent ml-auto block"
                            style={{
                              borderBottom: isReadonly || isSkipped ? 'none' : '1px solid var(--border2)',
                              color: 'var(--text)',
                              padding: '2px 0',
                            }}
                          />
                        </td>
                      )}

                      {/* Unité */}
                      <td className="px-3 py-2.5 text-left" style={{ color: 'var(--text2)' }}>
                        {post.unit}
                      </td>

                      {/* Mon prix */}
                      <td className="px-3 py-2.5">
                        {post.isOptional && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <input
                              type="checkbox"
                              id={`skip-${post.id}`}
                              checked={isSkipped}
                              disabled={isReadonly}
                              onChange={(e) =>
                                updatePost(post.id, {
                                  comment: e.target.checked ? '__SKIP__' : null,
                                  unitPrice: e.target.checked ? null : offerPost?.unitPrice ?? null,
                                })
                              }
                              className="w-3 h-3"
                            />
                            <label
                              htmlFor={`skip-${post.id}`}
                              className="text-xs"
                              style={{ color: 'var(--text3)', cursor: 'pointer' }}
                            >
                              Ne pas chiffrer
                            </label>
                          </div>
                        )}
                        {!isSkipped && (
                          <PriceInput
                            value={offerPost?.unitPrice ?? null}
                            onChange={(v) => updatePost(post.id, { unitPrice: v })}
                            disabled={isReadonly}
                          />
                        )}
                      </td>

                      {/* Total */}
                      <td
                        className="px-3 py-2.5 text-right tabular-nums font-medium"
                        style={{ color: total !== null ? 'var(--text)' : 'var(--text3)' }}
                      >
                        {isSkipped ? (
                          <span className="text-xs" style={{ color: 'var(--text3)' }}>Sans offre</span>
                        ) : total !== null ? (
                          `${formatPrice(total)} €`
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  )
                })}
                {/* Postes supprimés de ce lot */}
                {removedPosts.filter((rp) => rp.lotName === lot.name).map((rp) => (
                  <tr
                    key={`removed-${rp.id}`}
                    style={{ background: '#FEF2F2', opacity: 0.7, borderBottom: '1px solid var(--border)' }}
                  >
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>{rp.ref}</span>
                    </td>
                    <td className="px-3 py-2.5" colSpan={allowCustomQty ? 5 : 4}>
                      <div className="flex items-center gap-2">
                        <span style={{ color: 'var(--text3)', textDecoration: 'line-through' }}>{rp.title}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                          style={{ background: '#FEE8E8', color: '#9B1C1C' }}>
                          Supprimé
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs" style={{ color: 'var(--text3)' }}>—</td>
                  </tr>
                ))}
              </>
              )
            })}

            {/* Ligne total HT */}
            <tr style={{ background: 'var(--surface2)', borderTop: '2px solid var(--border)' }}>
              <td
                colSpan={allowCustomQty ? 5 : 4}
                className="px-3 py-2 font-semibold text-sm"
                style={{ color: 'var(--text)' }}
              >
                TOTAL GÉNÉRAL HT
              </td>
              <td
                colSpan={2}
                className="px-3 py-2 text-right font-semibold tabular-nums text-sm"
                style={{ color: grandComplete ? 'var(--text)' : 'var(--text3)' }}
              >
                {grandComplete ? `${formatPrice(grandTotal)} €` : '—'}
              </td>
            </tr>
            {/* Ligne TVA */}
            <tr style={{ background: 'var(--surface2)' }}>
              <td
                colSpan={allowCustomQty ? 5 : 4}
                className="px-3 py-1.5 text-sm"
                style={{ color: 'var(--text2)' }}
              >
                TVA (taux par lot)
              </td>
              <td
                colSpan={2}
                className="px-3 py-1.5 text-right tabular-nums text-sm"
                style={{ color: grandComplete ? 'var(--text2)' : 'var(--text3)' }}
              >
                {grandComplete ? `${formatPrice(grandTvA)} €` : '—'}
              </td>
            </tr>
            {/* Ligne TTC */}
            <tr style={{ background: 'var(--green-light)', borderTop: '1px solid var(--border)' }}>
              <td
                colSpan={allowCustomQty ? 5 : 4}
                className="px-3 py-3 font-bold"
                style={{ color: 'var(--green)', fontSize: '15px' }}
              >
                TOTAL GÉNÉRAL TTC
              </td>
              <td
                colSpan={2}
                className="px-3 py-3 text-right font-bold tabular-nums"
                style={{ color: grandComplete ? 'var(--green)' : 'var(--text3)', fontSize: '15px' }}
              >
                {grandComplete ? `${formatPrice(grandTotal + grandTvA)} €` : '—'}
              </td>
            </tr>
          </tbody>
        </table>
        </div>{/* end overflow-x-auto */}
      </div>

      {/* Instruction */}
      {!isReadonly && !isSubmitted && (
        <p className="text-xs mt-4 text-center" style={{ color: 'var(--text3)' }}>
          Vos prix sont sauvegardés automatiquement. Cliquez sur &quot;Soumettre mon offre&quot; quand vous avez terminé.
        </p>
      )}
    </div>
  )
}

// Export des ids pour soumission
export function getAllPostIds(lots: Lot[]): string[] {
  return lots.flatMap((l) => l.posts.map((p) => p.id))
}
