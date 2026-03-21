'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

export function AdminRefreshButton() {
  const router = useRouter()
  const [spinning, setSpinning] = useState(false)

  function handleRefresh() {
    setSpinning(true)
    router.refresh()
    // L'animation s'arrête après 600ms (le refresh est quasi-instantané)
    setTimeout(() => setSpinning(false), 600)
  }

  return (
    <button
      onClick={handleRefresh}
      title="Rafraîchir les données"
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
      style={{ border: '1px solid #E8E8E3', color: '#6B6B65', background: '#fff' }}
    >
      <RefreshCw
        size={13}
        style={{
          transition: 'transform 0.6s',
          transform: spinning ? 'rotate(360deg)' : 'rotate(0deg)',
        }}
      />
      Rafraîchir
    </button>
  )
}
