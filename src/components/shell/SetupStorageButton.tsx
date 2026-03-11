'use client'

import { useState } from 'react'
import { HardDrive } from 'lucide-react'

type Result = { bucket: string; status: 'created' | 'exists' | 'error'; message?: string }

export function SetupStorageButton() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Result[] | null>(null)

  async function handleSetup() {
    setLoading(true)
    setResults(null)
    try {
      const res = await fetch('/api/admin/setup-storage', { method: 'POST' })
      const data = await res.json() as { results?: Result[]; error?: string }
      if (data.results) setResults(data.results)
      else setResults([{ bucket: 'unknown', status: 'error', message: data.error }])
    } catch {
      setResults([{ bucket: 'unknown', status: 'error', message: 'Erreur réseau' }])
    }
    setLoading(false)
  }

  const statusColor = { created: 'text-green-400', exists: 'text-zinc-400', error: 'text-red-400' }
  const statusLabel = { created: '✓ créé', exists: '— déjà existant', error: '✗ erreur' }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-0.5">Stockage</p>
          <p className="text-zinc-300 text-sm">Buckets Supabase Storage</p>
        </div>
        <button
          onClick={handleSetup}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          <HardDrive size={14} />
          {loading ? 'En cours...' : 'Initialiser les buckets'}
        </button>
      </div>

      {results && (
        <div className="mt-3 space-y-1.5 border-t border-zinc-800 pt-3">
          {results.map((r) => (
            <div key={r.bucket} className="flex items-center justify-between text-xs">
              <span className="font-mono text-zinc-400">{r.bucket}</span>
              <span className={statusColor[r.status]}>
                {statusLabel[r.status]}{r.message ? ` — ${r.message}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
