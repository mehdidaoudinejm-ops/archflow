'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ADMIN_RED = '#DC2626'
const ADMIN_RED_LIGHT = '#FEF2F2'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '⬛' },
  { href: '/admin/waitlist', label: 'Liste d\'attente', icon: '⏳' },
  { href: '/admin/users', label: 'Utilisateurs', icon: '👥' },
  { href: '/admin/announcements', label: 'Bannières', icon: '📢' },
  { href: '/admin/emails', label: 'Emails', icon: '✉️' },
  { href: '/admin/billing', label: 'Facturation', icon: '💳' },
]

interface AdminShellProps {
  children: React.ReactNode
  adminEmail: string
}

export function AdminShell({ children, adminEmail }: AdminShellProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside
        className="w-56 flex-shrink-0 flex flex-col"
        style={{
          background: '#1A1A18',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/10">
          <span
            className="text-xl font-semibold"
            style={{ fontFamily: '"DM Serif Display", serif', color: '#fff' }}
          >
            ArchFlow
          </span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
            style={{ background: ADMIN_RED, color: '#fff' }}
          >
            Admin
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius)] text-sm transition-colors"
              style={{
                background: isActive(item.href) ? ADMIN_RED : 'transparent',
                color: isActive(item.href) ? '#fff' : 'rgba(255,255,255,0.55)',
              }}
            >
              <span style={{ fontSize: '14px', opacity: 0.8 }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-white/10">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius)] text-xs w-full transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            ← Retour à l&apos;app
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header
          className="flex items-center justify-between px-6 py-3.5 border-b"
          style={{ background: '#fff', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: ADMIN_RED }}
            />
            <span className="text-sm font-medium" style={{ color: 'var(--text2)' }}>
              Interface d&apos;administration
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2 py-1 rounded" style={{ background: ADMIN_RED_LIGHT, color: ADMIN_RED }}>
              {adminEmail}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
