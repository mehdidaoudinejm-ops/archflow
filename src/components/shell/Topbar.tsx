'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bell, ChevronDown, LogOut, Check } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  readAt: string | null
  createdAt: string
}

interface TopbarProps {
  user: {
    firstName?: string | null
    lastName?: string | null
    email: string
    avatarUrl?: string | null
  }
  projectName?: string
}

function NotificationDropdown() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.readAt).length

  async function fetchNotifications() {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) setNotifications(await res.json() as Notification[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchNotifications()
    const interval = setInterval(() => {
      if (!document.hidden) void fetchNotifications()
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
  }

  async function markAllRead() {
    await fetch('/api/notifications/read-all', { method: 'PATCH' })
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })))
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 1) return 'À l\'instant'
    if (min < 60) return `il y a ${min} min`
    const h = Math.floor(min / 60)
    if (h < 24) return `il y a ${h}h`
    return `il y a ${Math.floor(h / 24)}j`
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) void fetchNotifications() }}
        className="relative p-2 rounded-[var(--radius)] transition-colors hover:bg-[var(--surface2)]"
        style={{ color: 'var(--text2)' }}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center text-white rounded-full"
            style={{ background: 'var(--red)', fontSize: 10, fontWeight: 700 }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 rounded-[var(--radius-lg)] overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', zIndex: 50 }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs flex items-center gap-1"
                style={{ color: 'var(--green)' }}
              >
                <Check size={12} />
                Tout marquer lu
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 && (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text3)' }}>Chargement...</p>
            )}
            {!loading && notifications.length === 0 && (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text3)' }}>Aucune notification</p>
            )}
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={async () => {
                  if (!n.readAt) await markRead(n.id)
                  if (n.link) { router.push(n.link); setOpen(false) }
                }}
                className="px-4 py-3 border-b cursor-pointer hover:bg-[var(--surface2)] transition-colors"
                style={{
                  borderColor: 'var(--border)',
                  background: n.readAt ? 'transparent' : 'rgba(26,92,58,0.04)',
                }}
              >
                <div className="flex items-start gap-2.5">
                  {!n.readAt && (
                    <span className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--green)' }} />
                  )}
                  <div className={n.readAt ? 'w-full' : 'flex-1 min-w-0'}>
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{n.title}</p>
                    {n.body && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text2)' }}>{n.body}</p>}
                    <p className="text-xs mt-1" style={{ color: 'var(--text3)' }}>{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function Topbar({ user, projectName }: TopbarProps) {
  const router = useRouter()

  const initials =
    user.firstName && user.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user.email[0].toUpperCase()

  async function handleSignOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header
      className="h-14 flex items-center justify-between px-6 border-b shrink-0"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Nom du projet actif */}
      <div>
        {projectName ? (
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            {projectName}
          </p>
        ) : (
          <div />
        )}
      </div>

      {/* Actions droite */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <NotificationDropdown />

        {/* Avatar + menu utilisateur */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1 rounded-[var(--radius)] transition-colors hover:bg-[var(--surface2)]">
              <Avatar className="h-7 w-7">
                <AvatarFallback
                  style={{
                    background: 'var(--green-light)',
                    color: 'var(--green)',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm" style={{ color: 'var(--text)' }}>
                {user.firstName ?? user.email}
              </span>
              <ChevronDown size={14} style={{ color: 'var(--text3)' }} />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs" style={{ color: 'var(--text3)' }}>
                {user.email}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer text-sm gap-2"
              style={{ color: 'var(--red)' }}
            >
              <LogOut size={14} />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
