'use client'

import { useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'

// Lit le #access_token dans l'URL (magic link), établit la session Supabase,
// puis recharge la page pour que le server component puisse lire les cookies.
export function AuthHandler() {
  useEffect(() => {
    const hash = window.location.hash
    if (!hash) return

    const params = new URLSearchParams(hash.slice(1))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const error = params.get('error')

    if (error) {
      // Nettoyer le hash et laisser la page afficher l'erreur
      window.history.replaceState(null, '', window.location.pathname)
      return
    }

    if (accessToken && refreshToken) {
      const supabase = createBrowserClient()
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(() => {
          // Nettoyer le hash et recharger pour que le server component voie la session
          window.history.replaceState(null, '', window.location.pathname)
          window.location.reload()
        })
        .catch(() => {
          window.history.replaceState(null, '', window.location.pathname)
        })
    }
  }, [])

  return null
}
