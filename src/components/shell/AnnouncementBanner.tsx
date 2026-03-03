'use client'

import { useEffect, useState } from 'react'

interface AnnouncementData {
  id: string
  message: string
  type: 'INFO' | 'SUCCESS' | 'WARNING'
  link: string | null
}

const TYPE_STYLES: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  INFO: { bg: '#EFF6FF', border: '#BFDBFE', color: '#1D4ED8', icon: 'ℹ️' },
  SUCCESS: { bg: '#F0FDF4', border: '#A7F3D0', color: '#166534', icon: '✅' },
  WARNING: { bg: '#FFFBEB', border: '#FDE68A', color: '#92400E', icon: '⚠️' },
}

const DISMISSED_KEY = 'archflow:dismissed-announcements'

function getDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

function dismiss(id: string) {
  const dismissed = getDismissed()
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed, id]))
}

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])

  useEffect(() => {
    setDismissed(getDismissed())
    fetch('/api/announcements/active')
      .then(r => r.json())
      .then((d: AnnouncementData[]) => setAnnouncements(d))
      .catch(() => {})
  }, [])

  const visible = announcements.filter(a => !dismissed.includes(a.id))

  if (visible.length === 0) return null

  function handleDismiss(id: string) {
    dismiss(id)
    setDismissed(prev => [...prev, id])
  }

  return (
    <div className="space-y-0">
      {visible.map(a => {
        const style = TYPE_STYLES[a.type] ?? TYPE_STYLES.INFO
        return (
          <div
            key={a.id}
            className="px-4 py-2.5 flex items-center gap-3 text-sm"
            style={{
              background: style.bg,
              borderBottom: `1px solid ${style.border}`,
              color: style.color,
            }}
          >
            <span>{style.icon}</span>
            <span className="flex-1">{a.message}</span>
            {a.link && (
              <a
                href={a.link}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-xs font-medium"
                style={{ color: style.color }}
              >
                En savoir plus →
              </a>
            )}
            <button
              onClick={() => handleDismiss(a.id)}
              className="ml-2 opacity-50 hover:opacity-100 transition-opacity text-base leading-none"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
