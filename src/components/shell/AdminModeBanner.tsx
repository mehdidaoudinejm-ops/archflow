'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const STORAGE_KEY = '__adminImpersonating'

export function AdminModeBanner() {
  const [info, setInfo] = useState<{ email: string; name?: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setInfo(JSON.parse(raw))
    } catch {}
  }, [])

  async function handleExit() {
    localStorage.removeItem(STORAGE_KEY)
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!info) return null

  return (
    <div className="bg-orange-500 px-4 py-2 flex items-center justify-between text-sm text-white">
      <span>
        <strong>Mode Admin</strong> — connecté en tant que {info.name ?? info.email}
      </span>
      <button
        onClick={handleExit}
        className="px-3 py-1 rounded bg-white/20 hover:bg-white/30 transition-colors font-medium"
      >
        Quitter
      </button>
    </div>
  )
}
