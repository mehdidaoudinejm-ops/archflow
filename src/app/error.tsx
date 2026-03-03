'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--bg)' }}
    >
      <div className="text-center max-w-md">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'var(--red-light)' }}
        >
          <AlertTriangle size={24} style={{ color: 'var(--red)' }} />
        </div>
        <h1
          className="text-2xl font-semibold mb-2"
          style={{ fontFamily: 'var(--font-dm-serif)', color: 'var(--text)' }}
        >
          Une erreur est survenue
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text2)', lineHeight: '1.6' }}>
          Quelque chose s&apos;est mal passé. Vous pouvez réessayer ou retourner au tableau de bord.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 text-sm rounded-[var(--radius)] border font-medium"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--text2)',
              background: 'var(--surface)',
            }}
          >
            Réessayer
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 text-sm rounded-[var(--radius)] font-medium"
            style={{
              background: 'var(--green-btn)',
              color: '#fff',
              border: 'none',
            }}
          >
            Tableau de bord
          </button>
        </div>
      </div>
    </div>
  )
}
