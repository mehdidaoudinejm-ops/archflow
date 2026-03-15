'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'

// Page de fallback pour le hash-based flow (#access_token=...)
// Lit le hash, établit la session, puis redirige vers l'espace client
export default function AuthCallbackClientPage() {
  const [status, setStatus] = useState<'loading' | 'error'>('loading')

  useEffect(() => {
    const hash = window.location.hash
    if (!hash) { setStatus('error'); return }

    const params = new URLSearchParams(hash.slice(1))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const errorParam = params.get('error')
    const errorDescription = params.get('error_description')

    if (errorParam) {
      console.error('[auth/callback]', errorParam, errorDescription)
      setStatus('error')
      return
    }

    if (!accessToken || !refreshToken) { setStatus('error'); return }

    const supabase = createBrowserClient()
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(async ({ error }) => {
        if (error) { setStatus('error'); return }

        // Chercher le premier projet client de l'utilisateur
        const res = await fetch('/api/client/my-project')
        if (res.ok) {
          const { projectId, needsSetup } = await res.json()
          if (needsSetup) {
            window.location.href = projectId
              ? `/client/setup?next=/client/${projectId}`
              : '/client/setup'
          } else {
            window.location.href = projectId ? `/client/${projectId}` : '/client/no-project'
          }
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [])

  if (status === 'error') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F8F6' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ fontSize: 20, fontWeight: 600, color: '#1A1A18', marginBottom: 8 }}>Lien invalide ou expiré</p>
          <p style={{ fontSize: 14, color: '#6B6B65' }}>Demandez à votre architecte de vous renvoyer une invitation.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F8F6' }}>
      <p style={{ fontSize: 14, color: '#6B6B65' }}>Connexion en cours…</p>
    </div>
  )
}
