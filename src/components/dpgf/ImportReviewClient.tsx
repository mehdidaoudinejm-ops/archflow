'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import type { AIImportResult, ImportedLot, ImportedPost } from '@/lib/ai-import'

interface ImportReviewClientProps {
  importId: string
  dpgfId: string
  projectId: string
  projectName: string
  rawResponse: object
  globalConfidence: number
}

export function ImportReviewClient({
  importId,
  dpgfId,
  projectId,
  projectName,
  rawResponse,
  globalConfidence,
}: ImportReviewClientProps) {
  const router = useRouter()
  const [lots, setLots] = useState<ImportedLot[]>(
    (rawResponse as AIImportResult).lots ?? []
  )
  const [expandedLots, setExpandedLots] = useState<Set<number>>(
    new Set(lots.map((_, i) => i))
  )
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleLot(idx: number) {
    setExpandedLots((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  function updatePost(
    lotIdx: number,
    postIdx: number,
    field: keyof ImportedPost,
    value: string | number | null
  ) {
    setLots((prev) =>
      prev.map((lot, li) => {
        if (li !== lotIdx) return lot
        return {
          ...lot,
          posts: lot.posts.map((post, pi) => {
            if (pi !== postIdx) return post
            return { ...post, [field]: value }
          }),
        }
      })
    )
  }

  function updateSubLotPost(
    lotIdx: number,
    sublotIdx: number,
    postIdx: number,
    field: keyof ImportedPost,
    value: string | number | null
  ) {
    setLots((prev) =>
      prev.map((lot, li) => {
        if (li !== lotIdx) return lot
        return {
          ...lot,
          sublots: (lot.sublots ?? []).map((sl, si) => {
            if (si !== sublotIdx) return sl
            return {
              ...sl,
              posts: sl.posts.map((post, pi) => {
                if (pi !== postIdx) return post
                return { ...post, [field]: value }
              }),
            }
          }),
        }
      })
    )
  }

  async function handleImport() {
    setImporting(true)
    setError(null)
    try {
      const res = await fetch(`/api/ai-import/${importId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lots }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de l'import")
        setImporting(false)
        return
      }
      router.push(`/dpgf/${projectId}`)
    } catch {
      setError('Erreur réseau')
      setImporting(false)
    }
  }

  const confidenceColor =
    globalConfidence >= 80
      ? 'var(--green)'
      : globalConfidence >= 50
      ? 'var(--amber)'
      : 'var(--red)'

  const confidenceBg =
    globalConfidence >= 80
      ? 'var(--green-light)'
      : globalConfidence >= 50
      ? 'var(--amber-light)'
      : 'var(--red-light)'

  const totalPosts = lots.reduce(
    (acc, l) =>
      acc +
      l.posts.length +
      (l.sublots ?? []).reduce((sa, sl) => sa + sl.posts.length, 0),
    0
  )

  const totalSublots = lots.reduce((acc, l) => acc + (l.sublots ?? []).length, 0)

  const TABLE_HEADERS = ['Réf.', 'Intitulé', 'Qté', 'Unité', 'Prix unit.', 'Conf.']

  function renderPostRows(
    posts: ImportedPost[],
    onUpdate: (postIdx: number, field: keyof ImportedPost, value: string | number | null) => void
  ) {
    return posts.map((post, postIdx) => {
      const lowConf = post.confidence < 80
      return (
        <tr
          key={postIdx}
          style={{
            borderBottom: '1px solid var(--border)',
            background: lowConf ? 'var(--amber-light)' : 'var(--surface)',
          }}
        >
          <td className="px-3 py-1.5 font-mono text-xs" style={{ color: 'var(--text3)', whiteSpace: 'nowrap' }}>
            {post.ref ?? ''}
          </td>
          <td className="px-3 py-1.5">
            <input
              value={post.title}
              onChange={(e) => onUpdate(postIdx, 'title', e.target.value)}
              className="w-full bg-transparent outline-none text-xs"
              style={{ color: 'var(--text)', minWidth: '200px' }}
            />
          </td>
          <td className="px-3 py-1.5">
            <input
              type="number"
              value={post.qty ?? ''}
              onChange={(e) =>
                onUpdate(postIdx, 'qty', e.target.value ? Number(e.target.value) : null)
              }
              className="w-16 bg-transparent outline-none text-xs text-right"
              style={{ color: 'var(--text)' }}
            />
          </td>
          <td className="px-3 py-1.5">
            <input
              value={post.unit}
              onChange={(e) => onUpdate(postIdx, 'unit', e.target.value)}
              className="w-12 bg-transparent outline-none text-xs"
              style={{ color: 'var(--text)' }}
            />
          </td>
          <td className="px-3 py-1.5">
            <input
              type="number"
              value={post.unit_price ?? ''}
              onChange={(e) =>
                onUpdate(postIdx, 'unit_price', e.target.value ? Number(e.target.value) : null)
              }
              className="w-20 bg-transparent outline-none text-xs text-right"
              style={{ color: 'var(--text)' }}
            />
          </td>
          <td className="px-3 py-1.5">
            <span
              className="flex items-center gap-1 font-medium"
              style={{ color: lowConf ? 'var(--amber)' : 'var(--green)' }}
            >
              {lowConf && <AlertTriangle size={11} />}
              {post.confidence}%
            </span>
          </td>
        </tr>
      )
    })
  }

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm" style={{ color: 'var(--text3)' }}>{projectName}</p>
          <h1
            className="text-2xl font-semibold mt-0.5"
            style={{ fontFamily: 'var(--font-dm-serif)', color: 'var(--text)' }}
          >
            Vérification de l&apos;import IA
          </h1>
        </div>
        <button
          onClick={() => router.push(`/dpgf/${projectId}`)}
          className="text-sm px-3 py-1.5 rounded-[var(--radius)] border"
          style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--surface)' }}
        >
          Annuler
        </button>
      </div>

      {/* Score de confiance global */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius)]"
        style={{ background: confidenceBg, border: `1px solid ${confidenceColor}` }}
      >
        {globalConfidence >= 80 ? (
          <CheckCircle size={18} style={{ color: confidenceColor }} />
        ) : (
          <AlertTriangle size={18} style={{ color: confidenceColor }} />
        )}
        <div>
          <p className="text-sm font-medium" style={{ color: confidenceColor }}>
            Score de confiance global : {globalConfidence}%
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text2)' }}>
            {lots.length} lot{lots.length > 1 ? 's' : ''}
            {totalSublots > 0 && ` · ${totalSublots} sous-lot${totalSublots > 1 ? 's' : ''}`}
            {' · '}{totalPosts} poste{totalPosts > 1 ? 's' : ''} détectés
            {globalConfidence < 80 && ' — Vérifiez les champs surlignés en orange'}
          </p>
        </div>
      </div>

      {/* Tableau par lot */}
      <div className="space-y-3">
        {lots.map((lot, lotIdx) => {
          const lotPostCount =
            lot.posts.length +
            (lot.sublots ?? []).reduce((a, sl) => a + sl.posts.length, 0)
          return (
            <div
              key={lotIdx}
              className="rounded-[var(--radius-lg)] overflow-hidden"
              style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
            >
              {/* En-tête lot */}
              <button
                onClick={() => toggleLot(lotIdx)}
                className="w-full flex items-center gap-2 px-4 py-3 text-left"
                style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}
              >
                {expandedLots.has(lotIdx) ? (
                  <ChevronDown size={16} style={{ color: 'var(--text3)' }} />
                ) : (
                  <ChevronRight size={16} style={{ color: 'var(--text3)' }} />
                )}
                {lot.number && (
                  <span
                    className="text-xs font-mono font-semibold"
                    style={{ color: 'var(--text3)', minWidth: '1.5rem' }}
                  >
                    {lot.number}
                  </span>
                )}
                <input
                  value={lot.name}
                  onChange={(e) => {
                    e.stopPropagation()
                    setLots((prev) =>
                      prev.map((l, i) => (i === lotIdx ? { ...l, name: e.target.value } : l))
                    )
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-transparent text-sm font-semibold outline-none"
                  style={{ color: 'var(--text)' }}
                />
                <span className="text-xs" style={{ color: 'var(--text3)' }}>
                  {lotPostCount} poste{lotPostCount > 1 ? 's' : ''}
                </span>
              </button>

              {expandedLots.has(lotIdx) && (
                <>
                  {/* Postes directs (structure plate sans sous-lots) */}
                  {lot.posts.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            {TABLE_HEADERS.map((h) => (
                              <th
                                key={h}
                                className="px-3 py-2 text-left font-medium"
                                style={{ color: 'var(--text3)', background: 'var(--surface2)' }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {renderPostRows(lot.posts, (postIdx, field, value) =>
                            updatePost(lotIdx, postIdx, field, value)
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Sous-lots */}
                  {(lot.sublots ?? []).map((sublot, sublotIdx) => (
                    <div key={sublotIdx}>
                      {/* En-tête sous-lot */}
                      <div
                        className="flex items-center gap-2 px-4 py-2"
                        style={{
                          background: 'var(--bg)',
                          borderBottom: '1px solid var(--border)',
                          borderTop: sublotIdx > 0 ? '1px solid var(--border)' : undefined,
                        }}
                      >
                        <span
                          className="text-xs font-mono font-semibold"
                          style={{ color: 'var(--green)', minWidth: '2.5rem' }}
                        >
                          {sublot.number}
                        </span>
                        <input
                          value={sublot.name}
                          onChange={(e) => {
                            setLots((prev) =>
                              prev.map((l, li) => {
                                if (li !== lotIdx) return l
                                return {
                                  ...l,
                                  sublots: (l.sublots ?? []).map((sl, si) =>
                                    si === sublotIdx ? { ...sl, name: e.target.value } : sl
                                  ),
                                }
                              })
                            )
                          }}
                          className="flex-1 bg-transparent text-xs font-medium outline-none"
                          style={{ color: 'var(--text2)' }}
                        />
                        <span className="text-xs" style={{ color: 'var(--text3)' }}>
                          {sublot.posts.length} poste{sublot.posts.length > 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Postes du sous-lot */}
                      {sublot.posts.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                {TABLE_HEADERS.map((h) => (
                                  <th
                                    key={h}
                                    className="px-3 py-2 text-left font-medium"
                                    style={{ color: 'var(--text3)', background: 'var(--surface2)' }}
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {renderPostRows(sublot.posts, (postIdx, field, value) =>
                                updateSubLotPost(lotIdx, sublotIdx, postIdx, field, value)
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )
        })}
      </div>

      {error && (
        <p className="text-sm" style={{ color: 'var(--red)' }}>
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={() => router.push(`/dpgf/${projectId}`)}
          disabled={importing}
          className="px-4 py-2 text-sm rounded-[var(--radius)] border"
          style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--surface)' }}
        >
          Annuler
        </button>
        <button
          onClick={handleImport}
          disabled={importing || lots.length === 0}
          className="flex items-center gap-2 px-5 py-2 text-sm rounded-[var(--radius)] font-medium"
          style={{
            background: importing || lots.length === 0 ? 'var(--surface2)' : 'var(--green-btn)',
            color: importing || lots.length === 0 ? 'var(--text3)' : '#fff',
            border: 'none',
          }}
        >
          {importing && <Loader2 size={14} className="animate-spin" />}
          {importing ? 'Import en cours…' : 'Importer dans ma DPGF'}
        </button>
      </div>
    </div>
  )
}
