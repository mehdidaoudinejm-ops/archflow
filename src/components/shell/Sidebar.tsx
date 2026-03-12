'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Settings, FolderOpen, CreditCard, BookUser, ClipboardList } from 'lucide-react'
import type { Role } from '@prisma/client'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const architectNav: NavItem[] = [
  { href: '/dashboard', label: 'Projets', icon: <FolderOpen size={18} /> },
  { href: '/annuaire', label: 'Annuaire', icon: <BookUser size={18} /> },
  { href: '/settings/billing', label: 'Facturation', icon: <CreditCard size={18} /> },
  { href: '/settings', label: 'Paramètres', icon: <Settings size={18} /> },
]

const companyNav: NavItem[] = [
  { href: '/mes-appels-doffres', label: "Mes appels d'offres", icon: <ClipboardList size={18} /> },
  { href: '/settings', label: 'Paramètres', icon: <Settings size={18} /> },
]

export function Sidebar({ role }: { role?: Role }) {
  const pathname = usePathname()

  const navItems = role === 'COMPANY' ? companyNav : architectNav
  const showModule = role !== 'COMPANY'

  return (
    <aside
      className="flex flex-col w-56 shrink-0 min-h-screen py-6"
      style={{
        background: role === 'COMPANY' ? '#7ADFBB' : 'var(--green)',
        borderRight: role === 'COMPANY' ? '1px solid rgba(0,0,0,0.08)' : 'none',
      }}
    >
      {/* Logo */}
      <div className="px-5 mb-8">
        <Link href={role === 'COMPANY' ? '/mes-appels-doffres' : '/dashboard'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span
              className="text-2xl leading-none"
              style={{
                fontFamily: '"DM Serif Display", serif',
                color: role === 'COMPANY' ? '#1A3A2A' : '#fff',
              }}
            >
              ArchFlow
            </span>
            <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 8, fontWeight: 400, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C4C4BC' }}>
              By The Blueprint Lab
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/settings' && pathname.startsWith(item.href))
          const activeColor = role === 'COMPANY' ? '#1A3A2A' : '#fff'
          const inactiveColor = role === 'COMPANY' ? '#1A3A2A' : 'rgba(255,255,255,0.7)'
          const activeBg = role === 'COMPANY' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)'
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius)] text-sm transition-colors"
              style={{
                background: isActive ? activeBg : 'transparent',
                color: isActive ? activeColor : inactiveColor,
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Modules section — only for architects */}
      {showModule && (
        <div className="px-5 mt-4">
          <p
            className="text-xs font-medium uppercase tracking-wider mb-2"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            Modules
          </p>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius)] text-sm"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            <LayoutGrid size={16} />
            <span>DQE</span>
            <span
              className="ml-auto text-xs px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
            >
              Actif
            </span>
          </div>
        </div>
      )}
    </aside>
  )
}
