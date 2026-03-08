'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface Announcement {
  id: string
  message: string
  type: 'INFO' | 'SUCCESS' | 'WARNING'
  link: string | null
}

const styles: Record<string, { bar: string; text: string; btn: string }> = {
  INFO: {
    bar: 'bg-blue-500/10 border-blue-500/20',
    text: 'text-blue-700',
    btn: 'hover:bg-blue-500/20 text-blue-600',
  },
  SUCCESS: {
    bar: 'bg-green-500/10 border-green-500/20',
    text: 'text-green-700',
    btn: 'hover:bg-green-500/20 text-green-600',
  },
  WARNING: {
    bar: 'bg-amber-500/10 border-amber-500/20',
    text: 'text-amber-700',
    btn: 'hover:bg-amber-500/20 text-amber-600',
  },
}

const STORAGE_KEY = 'dismissed_announcements'

function getDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)

  useEffect(() => {
    fetch('/api/announcements/active')
      .then((r) => r.json())
      .then((data: Announcement | null) => {
        if (!data) return
        const dismissed = getDismissed()
        if (!dismissed.includes(data.id)) {
          setAnnouncement(data)
        }
      })
      .catch(() => {})
  }, [])

  function dismiss() {
    if (!announcement) return
    const dismissed = getDismissed()
    if (!dismissed.includes(announcement.id)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed, announcement.id]))
    }
    setAnnouncement(null)
  }

  if (!announcement) return null

  const s = styles[announcement.type] ?? styles.INFO

  return (
    <div className={`border-b px-4 py-2.5 flex items-center gap-3 text-sm ${s.bar}`}>
      <p className={`flex-1 ${s.text}`}>
        {announcement.message}
        {announcement.link && (
          <a
            href={announcement.link}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 underline underline-offset-2"
          >
            En savoir plus →
          </a>
        )}
      </p>
      <button
        onClick={dismiss}
        className={`p-1 rounded transition-colors ${s.btn}`}
        aria-label="Fermer"
      >
        <X size={14} />
      </button>
    </div>
  )
}
