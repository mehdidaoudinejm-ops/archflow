'use client'

import { useState } from 'react'

export function AdminSuspendButton({
  userId,
  initialSuspended,
}: {
  userId: string
  initialSuspended: boolean
}) {
  const [suspended, setSuspended] = useState(initialSuspended)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspended: !suspended }),
    })
    if (res.ok) setSuspended((v) => !v)
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="text-xs px-2 py-1 rounded-md transition-colors"
      style={{
        background: suspended ? '#FEF3E2' : '#FEE8E8',
        color: suspended ? '#B45309' : '#9B1C1C',
        border: `1px solid ${suspended ? '#F59E0B' : '#FCA5A5'}`,
        fontWeight: 500,
        opacity: loading ? 0.6 : 1,
      }}
    >
      {suspended ? 'Réactiver' : 'Suspendre'}
    </button>
  )
}
