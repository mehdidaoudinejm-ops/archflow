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
      className="flex flex-col w-56 shrink-0 min-h-screen border-r py-6"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* Logo */}
      <div className="px-5 mb-8">
        <Link href={role === 'COMPANY' ? '/mes-appels-doffres' : '/dashboard'}>
          <span
            className="text-2xl leading-none"
            style={{ fontFamily: '"DM Serif Display", serif', color: 'var(--green)' }}
          >
            ArchFlow
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/settings' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius)] text-sm transition-colors"
              style={{
                background: isActive ? 'var(--green-light)' : 'transparent',
                color: isActive ? 'var(--green)' : 'var(--text2)',
                fontWeight: isActive ? 500 : 400,
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
            style={{ color: 'var(--text3)' }}
          >
            Modules
          </p>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius)] text-sm"
            style={{ color: 'var(--text2)' }}
          >
            <LayoutGrid size={16} />
            <span>Consultation</span>
            <span
              className="ml-auto text-xs px-1.5 py-0.5 rounded"
              style={{ background: 'var(--green-light)', color: 'var(--green)' }}
            >
              Actif
            </span>
          </div>
        </div>
      )}
    </aside>
  )
}
