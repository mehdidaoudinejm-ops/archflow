'use client'

import { useState } from 'react'
import { Users } from 'lucide-react'

export function BackfillAnnuaireButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ total: number; created: number; skipped: number; errors: number } | null>(null)

  async function handleBackfill() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/backfill-annuaire', { method: 'POST' })
      const data = await res.json() as typeof result & { error?: string }
      if (data && 'total' in data) setResult(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-0.5">Annuaire</p>
          <p className="text-zinc-300 text-sm">Synchroniser les entreprises inscrites</p>
        </div>
        <button
          onClick={handleBackfill}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          <Users size={14} />
          {loading ? 'En cours...' : 'Backfill annuaire'}
        </button>
      </div>

      {result && (
        <div className="mt-3 border-t border-zinc-800 pt-3 flex gap-6 text-xs">
          <span className="text-zinc-400">Total : <strong className="text-zinc-200">{result.total}</strong></span>
          <span className="text-green-400">Créés : <strong>{result.created}</strong></span>
          <span className="text-zinc-500">Ignorés : <strong>{result.skipped}</strong></span>
          {result.errors > 0 && <span className="text-red-400">Erreurs : <strong>{result.errors}</strong></span>}
        </div>
      )}
    </div>
  )
}
